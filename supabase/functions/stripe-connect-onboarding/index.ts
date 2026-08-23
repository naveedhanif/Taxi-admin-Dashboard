// supabase/functions/stripe-connect-onboarding/index.ts
//
// Creates (if needed) a Stripe Express Connect account for a driver and
// returns a fresh Account Link URL for Stripe's hosted onboarding flow.
// This is the real, documented Stripe Connect Express pattern — see
// https://docs.stripe.com/connect/express-accounts.
//
// The dashboard's StripeOnboardingScreen calls this, then redirects the
// browser to the returned url. Stripe redirects back to `return_url` on
// success and `refresh_url` if the link expired or the driver needs to
// restart onboarding.
//
// NOT LIVE-TESTED — this sandbox has no network path to api.stripe.com.
// Written to match Stripe's documented Connect + Account Links API
// exactly. Test against a real Stripe test-mode key once deployed.
//
// Deploy: supabase functions deploy stripe-connect-onboarding
// Required secrets (already set for create-booking, reused here):
//   STRIPE_SECRET_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - auto-provided by Supabase

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingRequest {
  return_url: string;
  refresh_url: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: OnboardingRequest = await req.json();
    if (!body.return_url || !body.refresh_url) {
      return jsonError("Missing required field: return_url and refresh_url", 400);
    }

    // ---- Identify the calling driver from their auth session ----
    // This function is called from the logged-in driver dashboard, so it
    // trusts the caller's own session rather than taking a driver_id in
    // the body — a driver can only ever onboard themselves.
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
      .select("id, email, business_name, stripe_connect_account_id, stripe_connect_onboarded")
      .eq("user_id", userData.user.id)
      .single();

    if (driverError || !driver) {
      return jsonError("No driver account found for this user", 404);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    // ---- Create the Express account if this driver doesn't have one yet ----
    let accountId = driver.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: driver.email ?? undefined,
        business_type: "individual",
        business_profile: {
          name: driver.business_name ?? undefined,
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });
      accountId = account.id;

      const { error: updateError } = await supabase
        .from("drivers")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", driver.id);

      if (updateError) {
        return jsonError(`Created Stripe account but failed to save it: ${updateError.message}`, 500);
      }
    }

    // ---- Create a fresh Account Link for hosted onboarding ----
    // Account Links expire after a few minutes, so this is always
    // generated fresh on demand rather than cached.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: body.return_url,
      refresh_url: body.refresh_url,
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("stripe-connect-onboarding error:", err);
    return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    status,
  });
}
