// supabase/functions/stripe-connect-onboarding/index.ts
//
// Creates (if needed) a Stripe Connect account for a driver and returns
// a fresh Account Link URL for Stripe's hosted onboarding flow.
//
// Uses the Accounts v2 API (/v2/core/accounts + /v2/core/account_links),
// NOT the older v1 accounts.create/accountLinks.create SDK helpers. This
// project's Stripe account has v1 Connect account creation disabled
// (Stripe's new-integration default), which is what caused:
//   "Stripe no longer recommends Accounts v1 for new Connect
//   integrations. Create connected accounts with POST /v2/core/accounts
//   instead."
// v2 endpoints aren't yet exposed as typed methods on the stripe-node
// SDK (still preview), so this calls them directly via fetch with the
// documented Stripe-Version header. See:
//   https://docs.stripe.com/connect/saas/tasks/create
//   https://docs.stripe.com/api/v2/core/account-links/create
//
// NOT LIVE-TESTED — this sandbox has no network path to api.stripe.com.
// Written to match Stripe's documented v2 request/response shapes
// exactly. Test against a real Stripe test-mode key once deployed.
//
// Deploy: supabase functions deploy stripe-connect-onboarding
// Required secrets (already set for create-booking, reused here):
//   STRIPE_SECRET_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - auto-provided by Supabase

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stable (non-preview) GA version as of when this was last checked.
// v2/core/accounts and v2/core/account_links are stable at this version
// for the "full dashboard + Stripe collects fees/losses" combination
// used below. If Stripe returns a version-related error, check
// https://docs.stripe.com/api/versioning for the current GA version.
const STRIPE_API_VERSION = "2026-07-29.dahlia";

interface OnboardingRequest {
  return_url: string;
  refresh_url: string;
}

async function stripeV2Fetch(path: string, body: unknown) {
  const res = await fetch(`https://api.stripe.com/v2${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe v2 API error (${res.status})`);
  }
  return data;
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

    // ---- Create the connected account (v2) if this driver doesn't have one yet ----
    let accountId = driver.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripeV2Fetch("/core/accounts", {
        contact_email: driver.email ?? undefined,
        display_name: driver.business_name ?? undefined,
        // "full" dashboard access + Stripe collecting fees/losses is
        // Stripe's documented default combination (see the code sample
        // at https://docs.stripe.com/connect/saas/tasks/create). The
        // "express" dashboard + Stripe-collects-losses combination is
        // still in preview and requires embedded components (onboarding,
        // account management, notification banner) that this app
        // doesn't have — using it caused "This account configuration is
        // not supported" since none of the extra preview requirements
        // were met. Full dashboard access avoids that entirely: drivers
        // manage their Stripe account at dashboard.stripe.com directly.
        dashboard: "full",
        identity: {
          country: "ie",
          entity_type: "individual",
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
        defaults: {
          currency: "eur",
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
          locales: ["en-IE"],
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

    // ---- Create a fresh Account Link (v2) for hosted onboarding ----
    // Account Links expire after a few minutes, so this is always
    // generated fresh on demand rather than cached.
    const accountLink = await stripeV2Fetch("/core/account_links", {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["merchant"],
          refresh_url: body.refresh_url,
          return_url: body.return_url,
        },
      },
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
