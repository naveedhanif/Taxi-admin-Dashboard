// supabase/functions/stripe-connect-status/index.ts
//
// Checks a driver's Stripe Connect account status (Accounts v2) and
// syncs drivers.stripe_connect_onboarded in the database. Call this
// when the driver lands back on the dashboard after Stripe's hosted
// onboarding (the return_url from stripe-connect-onboarding) — Stripe
// doesn't push a webhook synchronously, so the dashboard polls this
// once on return instead of waiting on webhook infrastructure.
//
// Uses GET /v2/core/accounts/{id} with the merchant capability included,
// NOT stripe.accounts.retrieve() (v1) — v2 accounts don't have a flat
// charges_enabled/details_submitted shape; status lives at
// configuration.merchant.capabilities.card_payments.status. See
// stripe-connect-onboarding/index.ts for why v1 isn't usable here.
//
// For production hardening later: add a Stripe webhook listening for
// `v2.core.account[configuration.merchant].updated` as the source of
// truth, and use this endpoint only as a fallback/manual-refresh.
//
// NOT LIVE-TESTED — see stripe-connect-onboarding/index.ts for context.
//
// Deploy: supabase functions deploy stripe-connect-status
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keep in sync with stripe-connect-onboarding/index.ts.
const STRIPE_API_VERSION = "2025-11-17.preview";

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

    const res = await fetch(
      `https://api.stripe.com/v2/core/accounts/${driver.stripe_connect_account_id}?include=configuration.merchant,requirements`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
          "Stripe-Version": STRIPE_API_VERSION,
        },
      }
    );
    const account = await res.json();
    if (!res.ok) {
      throw new Error(account?.error?.message || `Stripe v2 API error (${res.status})`);
    }

    const cardPaymentsStatus = account?.configuration?.merchant?.capabilities?.card_payments?.status;
    const payoutsStatus = account?.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status;
    const chargesEnabled = cardPaymentsStatus === "active";
    const payoutsEnabled = payoutsStatus === "active";
    // "Onboarded" for this app's purposes: card payments are active and
    // there's nothing currently blocking the account. v2 doesn't have a
    // single details_submitted flag like v1 — requirements.currently_due
    // being empty is the closest equivalent.
    const hasOutstandingRequirements = (account?.requirements?.currently_due?.length ?? 0) > 0;
    const onboarded = chargesEnabled && !hasOutstandingRequirements;

    const { error: updateError } = await supabase
      .from("drivers")
      .update({ stripe_connect_onboarded: onboarded })
      .eq("id", driver.id);

    if (updateError) {
      return jsonError(`Checked Stripe status but failed to save it: ${updateError.message}`, 500);
    }

    return new Response(
      JSON.stringify({ onboarded, chargesEnabled, payoutsEnabled }),
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
