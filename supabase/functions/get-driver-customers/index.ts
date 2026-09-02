// supabase/functions/get-driver-customers/index.ts
//
// Powers the driver's new "Customers" Settings tab: every signed-in
// customer who has an account with this driver, with real aggregated
// stats (trip count, total spent, last ride) computed from `bookings`
// — not stored counters, so it's always correct even if a booking is
// edited/cancelled after the fact.
//
// Guest passengers (no `customers` row) deliberately aren't listed
// here — there's no persistent identity to attach a ledger entry or a
// targeted promo code to, same reasoning as get-customer-bookings.
//
// `customers` has no public RLS policies (see signup-customer/index.ts's
// header comment), so this has to go through the service role rather
// than a direct client-side query.
//
// AUTHORIZATION: the driver's own signed-in session, matched against
// drivers.user_id — same pattern as get-driver-reviews.
//
// Deploy: supabase functions deploy get-driver-customers
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
      .select("id, user_id")
      .eq("id", body.driver_id)
      .single();
    if (driverError || !driver || driver.user_id !== userData.user.id) {
      return jsonError("Not authorized for this driver account", 403);
    }

    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, phone, email, created_at")
      .eq("driver_id", body.driver_id);
    if (customersError) return jsonError(customersError.message, 500);

    if (!customers || customers.length === 0) {
      return new Response(JSON.stringify({ customers: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Same "completed" + final_fare-or-estimated_fare pattern used by
    // EarningsScreen — one query for every customer's bookings at
    // once, aggregated client-side-of-this-function rather than N
    // separate queries.
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("customer_id, final_fare, estimated_fare, tip_amount, scheduled_time")
      .eq("driver_id", body.driver_id)
      .eq("status", "completed")
      .in("customer_id", customers.map((c) => c.id));
    if (bookingsError) return jsonError(bookingsError.message, 500);

    const statsByCustomer: Record<string, { tripCount: number; totalSpent: number; lastRide: string | null }> = {};
    for (const b of bookings ?? []) {
      if (!b.customer_id) continue;
      const stat = statsByCustomer[b.customer_id] ?? { tripCount: 0, totalSpent: 0, lastRide: null };
      stat.tripCount += 1;
      stat.totalSpent += Number(b.final_fare ?? b.estimated_fare ?? 0) + Number(b.tip_amount ?? 0);
      if (!stat.lastRide || new Date(b.scheduled_time) > new Date(stat.lastRide)) {
        stat.lastRide = b.scheduled_time;
      }
      statsByCustomer[b.customer_id] = stat;
    }

    const result = customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        signedUpAt: c.created_at,
        tripCount: statsByCustomer[c.id]?.tripCount ?? 0,
        totalSpent: Math.round((statsByCustomer[c.id]?.totalSpent ?? 0) * 100) / 100,
        lastRide: statsByCustomer[c.id]?.lastRide ?? null,
      }))
      // Most valuable / most recently active customers first.
      .sort((a, b) => (b.lastRide ? new Date(b.lastRide).getTime() : 0) - (a.lastRide ? new Date(a.lastRide).getTime() : 0));

    return new Response(JSON.stringify({ customers: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("get-driver-customers error:", err);
    return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
