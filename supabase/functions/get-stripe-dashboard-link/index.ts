// supabase/functions/get-stripe-dashboard-link/index.ts
//
// Generates a one-time login link into the driver's own Stripe Express
// dashboard — where real payout history, transfer timing, and bank
// account details actually live. The Earnings screen's own totals are
// computed from this app's own booking records, which is useful for a
// quick summary but isn't a substitute for Stripe's own authoritative
// payout records.
//
// AUTHORIZATION: requires the driver's own signed-in session — this
// generates a login link for A SPECIFIC connected account, so it must
// only ever be issued to the driver who actually owns that account.
//
// Deploy: supabase functions deploy get-stripe-dashboard-link
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

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

    // Confirms the requesting user genuinely owns THIS driver_id before
    // issuing a login link into its connected Stripe account.
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, user_id, stripe_connect_account_id, stripe_connect_onboarded")
      .eq("id", body.driver_id)
      .single();
    if (driverError || !driver || driver.user_id !== userData.user.id) {
      return jsonError("Not authorized for this driver account", 403);
    }
    if (!driver.stripe_connect_onboarded || !driver.stripe_connect_account_id) {
      return jsonError("Stripe Connect isn't set up yet — finish onboarding first", 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const loginLink = await stripe.accounts.createLoginLink(driver.stripe_connect_account_id);

    return new Response(JSON.stringify({ url: loginLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-stripe-dashboard-link error:", err);
    return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
