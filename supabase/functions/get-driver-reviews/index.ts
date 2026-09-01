// supabase/functions/get-driver-reviews/index.ts
//
// Lets the driver see their OWN individual reviews (rating + comment +
// date) — not just the avg_rating/review_count aggregate that's been
// visible on the passenger booking form since Phase 1. The `reviews`
// table has RLS enabled with no public policies at all (see
// submit-review/index.ts's own comment — service role is the only
// intended writer), so a driver's own authenticated client can't read
// it directly either. This is required, not optional.
//
// AUTHORIZATION: the driver's own signed-in session, matched against
// drivers.user_id — a driver can only ever see reviews about
// themselves.
//
// Deploy: supabase functions deploy get-driver-reviews
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  driver_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    if (!body.driver_id) return jsonError("Missing required field: driver_id", 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Not signed in", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) return jsonError("Not signed in", 401);

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, user_id, avg_rating, review_count")
      .eq("id", body.driver_id)
      .single();
    if (driverError || !driver || driver.user_id !== userData.user.id) {
      return jsonError("Not authorized for this driver account", 403);
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("driver_id", body.driver_id)
      .order("created_at", { ascending: false });
    if (reviewsError) return jsonError(reviewsError.message, 500);

    return new Response(
      JSON.stringify({
        avgRating: driver.avg_rating ?? null,
        reviewCount: driver.review_count ?? 0,
        reviews: reviews ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-driver-reviews error:", err);
    return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
