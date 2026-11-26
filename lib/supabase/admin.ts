import { createClient } from "@supabase/supabase-js";

// SERVER ONLY. This client uses the secret key, which can bypass row-level
// security. Never import this file from a Client Component, and never put the
// secret key in a variable that starts with NEXT_PUBLIC_.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
