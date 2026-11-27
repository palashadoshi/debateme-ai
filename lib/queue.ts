import { createAdminClient } from "@/lib/supabase/admin";

// Gemini allows 15 requests per minute on your key. One request every 5
// seconds is 12 per minute, which leaves room for the daily prompt and retries.
const GAP_SECONDS = Number(process.env.GRADER_GAP_SECONDS) || 5;
const MAX_WAIT_SECONDS = Number(process.env.GRADER_MAX_WAIT_SECONDS) || 60;

// Waits for this request's turn. Returns false if the line is too long.
export async function waitForGraderTurn(): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_grader_slot", {
    gap_seconds: GAP_SECONDS,
    max_wait_seconds: MAX_WAIT_SECONDS,
  });

  if (error) {
    // If the queue itself is broken (for example queue.sql was never run),
    // keep the game working instead of blocking everyone.
    console.error("Grader queue unavailable, skipping the wait:", error);
    return true;
  }

  if (data === null || data === undefined) return false; // line is too long

  const waitMs = Math.ceil(Number(data) * 1000);
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  return true;
}
