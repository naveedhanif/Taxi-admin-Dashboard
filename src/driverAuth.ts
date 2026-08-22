import { supabase } from "./supabaseClient";

/**
 * Real Supabase Auth + drivers-table wiring for the driver dashboard.
 *
 * NOT LIVE-TESTED against a real Supabase Auth call — this sandbox has
 * no network path to Supabase's auth endpoint. This follows Supabase's
 * documented Auth API exactly; the first real test is an actual signup
 * attempt in a running browser.
 */

export interface SignUpParams {
  email: string;
  password: string;
  businessName: string;
  phone: string;
  bookingSlug: string;
}

export interface AuthResult {
  driverId: string | null;
  error: string | null;
}

/**
 * Creates a new driver account: an auth.users row via Supabase Auth,
 * then a matching drivers row. If the drivers insert fails after the
 * auth user was created, the auth user is left dangling — this is the
 * exact kind of atomicity gap flagged earlier; a production version
 * should do this inside a single Postgres function (RPC) instead of
 * two separate client calls, so it's genuinely all-or-nothing.
 */
export async function signUpDriver({ email, password, businessName, phone, bookingSlug }: SignUpParams): Promise<AuthResult> {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

  if (authError) {
    return { driverId: null, error: authError.message };
  }
  if (!authData.user) {
    return { driverId: null, error: "Sign up succeeded but no user was returned — check your email to confirm your account." };
  }

  const { data: driverRow, error: driverError } = await supabase
    .from("drivers")
    .insert({
      user_id: authData.user.id,
      business_name: businessName,
      phone,
      email,
      booking_slug: bookingSlug,
    })
    .select("id")
    .single();

  if (driverError) {
    // Common real-world case: booking_slug already taken by another driver
    if (driverError.code === "23505") {
      return { driverId: null, error: "That booking link is already taken — try a different business name." };
    }
    return { driverId: null, error: driverError.message };
  }

  return { driverId: driverRow.id, error: null };
}

export async function signInDriver(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { driverId: null, error: error.message };
  }

  return getDriverForUser(data.user.id);
}

export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error: error?.message ?? null };
}

/** Looks up the drivers row belonging to an already-authenticated user. */
export async function getDriverForUser(userId: string): Promise<AuthResult> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error) {
    return { driverId: null, error: "No driver profile found for this account — onboarding may be incomplete." };
  }

  return { driverId: data.id, error: null };
}

export async function signOutDriver() {
  await supabase.auth.signOut();
}

