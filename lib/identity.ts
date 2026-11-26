import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

export type Identity = {
  userId: string | null; // set when logged in
  guestId: string | null; // set for logged-out visitors
  newGuestId: string | null; // set only if we just made a new guest cookie
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Works out who is making the request. Logged-in users are identified by their
// verified login token. Logged-out visitors get an anonymous cookie.
export async function getIdentity(createGuest: boolean): Promise<Identity> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  if (userId) return { userId, guestId: null, newGuestId: null };

  const cookieStore = await cookies();
  const existing = cookieStore.get("guest_id")?.value;
  if (existing && UUID.test(existing)) {
    return { userId: null, guestId: existing, newGuestId: null };
  }
  if (!createGuest) return { userId: null, guestId: null, newGuestId: null };

  const id = randomUUID();
  return { userId: null, guestId: id, newGuestId: id };
}

export const GUEST_COOKIE = {
  name: "guest_id",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  },
};
