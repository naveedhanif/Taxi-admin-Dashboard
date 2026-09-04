import { supabase } from "./supabaseClient";

/**
 * Real Supabase Auth + drivers-table wiring for the driver dashboard.
 *
 * Driver row creation goes through the signup-driver edge function
 * (service-role write) rather than a direct client insert — the
 * direct insert this file used to do failed with "new row violates
 * row-level security policy for table drivers" the first time it was
 * actually tried against the real database, since `drivers` has no
 * public INSERT policy, same as every other new-account table in this
 * project. Same fix already applied to customer signup earlier;
 * driver signup had never actually been corrected until now.
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
 * then a matching drivers row via signup-driver (service role, so it
 * isn't blocked by RLS the way a direct client insert was).
 */
export async function signUpDriver({ email, password, businessName, phone, bookingSlug }: SignUpParams): Promise<AuthResult> {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

  if (authError) {
    return { driverId: null, error: authError.message };
  }
  if (!authData.user) {
    return { driverId: null, error: "Sign up succeeded but no user was returned — check your email to confirm your account." };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/signup-driver`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      body: JSON.stringify({
        user_id: authData.user.id,
        email,
        business_name: businessName,
        phone,
        booking_slug: bookingSlug,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { driverId: null, error: data.error || "Something went wrong creating your driver account" };
    }
    return { driverId: data.driverId, error: null };
  } catch (err) {
    return { driverId: null, error: err instanceof Error ? err.message : "Something went wrong creating your driver account" };
  }
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

