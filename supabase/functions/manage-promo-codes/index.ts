// supabase/functions/manage-promo-codes/index.ts
//
// Lets a driver create/list/toggle/delete their own promo codes.
// Redemption/validation is NOT here — that happens server-side inside
// create-booking (never trust the client on anything that changes a
// charge amount), same principle as every other payment-adjacent path
// in this project.
//
// A code with customer_id set is a targeted discount for exactly one
// of this driver's customers. A code with customer_id NULL is a
// broadcast discount any of this driver's customers can use.
//
// Requires the promo_codes table + bookings.promo_code_id/
// discount_amount columns — see phase8-promo-codes.sql.
//
// AUTHORIZATION: the driver's own signed-in session, matched against
// drivers.user_id — same pattern as get-driver-reviews.
//
// Deploy: supabase functions deploy manage-promo-codes
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "list" | "create" | "toggle" | "delete";
  driver_id: string;
  code?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  customer_id?: string | null;
  max_uses?: number | null;
  expires_at?: string | null;
  promo_id?: string;
  active?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    if (!body.action || !body.driver_id) {
      return jsonError("Missing required field: action, driver_id", 400);
    }

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

    const SELECT_COLS = "id, code, discount_type, discount_value, customer_id, max_uses, uses_count, active, expires_at, created_at";

    if (body.action === "list") {
      const { data: promos, error: promosError } = await supabase
        .from("promo_codes")
        .select(SELECT_COLS)
        .eq("driver_id", body.driver_id)
        .order("created_at", { ascending: false });
      if (promosError) return jsonError(promosError.message, 500);

      // Attach the customer's name for any targeted codes, so the UI
      // doesn't have to make a second round trip just to show "for
      // whom" — broadcast codes (customer_id null) just show null.
      const customerIds = [...new Set((promos ?? []).map((p) => p.customer_id).filter(Boolean))];
      let namesById: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from("customers")
          .select("id, name")
          .in("id", customerIds);
        namesById = Object.fromEntries((customers ?? []).map((c) => [c.id, c.name]));
      }

      return new Response(
        JSON.stringify({
          promos: (promos ?? []).map((p) => ({ ...p, customer_name: p.customer_id ? namesById[p.customer_id] ?? null : null })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "create") {
      const required = ["code", "discount_type", "discount_value"];
      for (const field of required) {
        if (body[field as keyof RequestBody] === undefined) return jsonError(`Missing required field: ${field}`, 400);
      }
      if (body.discount_type !== "percent" && body.discount_type !== "fixed") {
        return jsonError("discount_type must be 'percent' or 'fixed'", 400);
      }
      if (!body.discount_value || body.discount_value <= 0) {
        return jsonError("discount_value must be greater than 0", 400);
      }
      if (body.discount_type === "percent" && body.discount_value > 100) {
        return jsonError("A percent discount can't exceed 100", 400);
      }

      // If targeted, confirm the customer actually belongs to this
      // driver before creating a code for them.
      if (body.customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("id")
          .eq("id", body.customer_id)
          .eq("driver_id", body.driver_id)
          .single();
        if (customerError || !customer) return jsonError("That customer isn't one of yours", 404);
      }

      const { data: promo, error: insertError } = await supabase
        .from("promo_codes")
        .insert({
          driver_id: body.driver_id,
          code: body.code.trim().toUpperCase(),
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          customer_id: body.customer_id || null,
          max_uses: body.max_uses ?? null,
          expires_at: body.expires_at || null,
        })
        .select(SELECT_COLS)
        .single();

      if (insertError) {
        // Most likely the UNIQUE(driver_id, code) constraint.
        if (insertError.message.includes("duplicate key")) {
          return jsonError("You already have a code with that name", 409);
        }
        return jsonError(insertError.message, 500);
      }
      return new Response(JSON.stringify({ promo }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "toggle") {
      if (!body.promo_id || body.active === undefined) return jsonError("Missing required field: promo_id, active", 400);
      const { error: updateError } = await supabase
        .from("promo_codes")
        .update({ active: body.active })
        .eq("id", body.promo_id)
        .eq("driver_id", body.driver_id);
      if (updateError) return jsonError(updateError.message, 500);
      return new Response(JSON.stringify({ updated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "delete") {
      if (!body.promo_id) return jsonError("Missing required field: promo_id", 400);
      const { error: deleteError } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", body.promo_id)
        .eq("driver_id", body.driver_id);
      if (deleteError) return jsonError(deleteError.message, 500);
      return new Response(JSON.stringify({ deleted: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return jsonError("Unknown action", 400);
  } catch (err) {
    console.error("manage-promo-codes error:", err);
    return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
