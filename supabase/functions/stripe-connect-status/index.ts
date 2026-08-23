// supabase/functions/stripe-connect-status/index.ts
//
// Checks a driver's Stripe Express account status and syncs
// drivers.stripe_connect_onboarded in the database. Call this when the
// driver lands back on the dashboard after Stripe's hosted onboarding
// (the return_url from stripe-connect-onboarding) — Stripe doesn't push
// a webhook synchronously, so the dashboard polls this once on return
// instead of waiting on webhook infrastructure.
//
// For production hardening later: add a Stripe webhook listening for
// `account.updated` as the source of truth, and use this endpoint only
// as a fallback/manual-refresh. This is a reasonable v1 given no webhook
// endpoint exists yet.
//
// NOT LIVE-TESTED — see stripe-connect-onboarding/index.ts for context.
//
// Deploy: supabase functions deploy stripe-connect-status
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing Authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData?.user) {
      return jsonError("Not authenticated", 401);
    }

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, stripe_connect_account_id")
      .eq("user_id", userData.user.id)
      .single();

    if (driverError || !driver) {
      return jsonError("No driver account found for this user", 404);
    }

    if (!driver.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ onboarded: false, chargesEnabled: false, payoutsEnabled: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const account = await stripe.accounts.retrieve(driver.stripe_connect_account_id);

    const onboarded = Boolean(account.details_submitted && account.charges_enabled);

    const { error: updateError } = await supabase
      .from("drivers")
      .update({ stripe_connect_onboarded: onboarded })
      .eq("id", driver.id);

    if (updateError) {
      return jsonError(`Checked Stripe status but failed to save it: ${updateError.message}`, 500);
    }

    return new Response(
      JSON.stringify({
        onboarded,
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("stripe-connect-status error:", err);
    return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    status,
  });
}
