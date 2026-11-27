import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findTodayPrompt, getOrCreateTodayPrompt } from "@/lib/dailyPrompt";
import { GUEST_COOKIE, getIdentity } from "@/lib/identity";
import { gradeResponse } from "@/lib/grader";
import { waitForGraderTurn } from "@/lib/queue";
import {
  MAX_CHARS,
  MIN_WORDS,
  WORD_LIMIT,
  countWords,
  isDifficulty,
} from "@/lib/limits";

// Safety net for your wallet: total gradings allowed in any 24 hours.
const DAILY_CAP = Number(process.env.DAILY_GRADE_CAP) || 300;
const STALE_MS = 2 * 60 * 1000;

type Row = {
  difficulty: string;
  response_text: string;
  score: number | null;
  tips: string | null;
};

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

// Tips are only included for logged-in users. This is enforced here on the
// server, so hiding them in the page alone is not what protects them.
function shape(row: Row, loggedIn: boolean) {
  const tips = row.tips ? row.tips.split("\n").filter(Boolean) : [];
  return {
    score: row.score,
    difficulty: row.difficulty,
    response: row.response_text,
    tips: loggedIn ? tips : [],
    tipsLocked: !loggedIn,
  };
}

// Has this person already played today? Used when the play page loads.
export async function GET() {
  try {
    const who = await getIdentity(false);
    const owner = who.userId ?? who.guestId;
    if (!owner) return NextResponse.json({ submitted: false });

    const prompt = await findTodayPrompt();
    if (!prompt) return NextResponse.json({ submitted: false });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("submissions")
      .select("difficulty, response_text, score, tips")
      .eq("prompt_id", prompt.id)
      .eq(who.userId ? "user_id" : "guest_id", owner)
      .maybeSingle();
    if (error) throw error;

    if (!data || data.score === null)
      return NextResponse.json({ submitted: false });
    return NextResponse.json({
      submitted: true,
      result: shape(data, !!who.userId),
    });
  } catch (err) {
    console.error("GET /api/grade failed:", err);
    return fail(500, "Could not check your submission.");
  }
}

export async function POST(request: Request) {
  let body: { response?: unknown; difficulty?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request.");
  }

  // 1. Validate everything on the server. Never trust the browser's checks.
  if (typeof body.response !== "string" || !isDifficulty(body.difficulty)) {
    return fail(400, "Invalid request.");
  }
  const difficulty = body.difficulty;
  const text = body.response.trim();
  const words = countWords(text);
  if (words < MIN_WORDS) return fail(400, `Write at least ${MIN_WORDS} words.`);
  if (words > WORD_LIMIT)
    return fail(400, `Keep it to ${WORD_LIMIT} words or fewer.`);
  if (text.length > MAX_CHARS) return fail(400, "Your response is too long.");

  try {
    const who = await getIdentity(true);
    const ownerCol = who.userId ? "user_id" : "guest_id";
    const ownerVal = (who.userId ?? who.guestId) as string;
    const admin = createAdminClient();
    const prompt = await getOrCreateTodayPrompt();

    // 2. Global daily cap.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_CAP) {
      return fail(
        503,
        "The grader has hit its limit for today. Try again tomorrow!",
      );
    }

    // 3. Reserve today's one try BEFORE calling the AI, so two quick clicks
    //    can't both get graded. The table's unique rule is what enforces it.
    await admin
      .from("submissions")
      .delete()
      .eq("prompt_id", prompt.id)
      .eq(ownerCol, ownerVal)
      .is("score", null)
      .lt("created_at", new Date(Date.now() - STALE_MS).toISOString());

    const reserved = await admin
      .from("submissions")
      .insert({
        user_id: who.userId,
        guest_id: who.userId ? null : who.guestId,
        prompt_id: prompt.id,
        difficulty,
        response_text: text,
      })
      .select("id")
      .single();

    if (reserved.error) {
      if (reserved.error.code === "23505") {
        const prev = await admin
          .from("submissions")
          .select("difficulty, response_text, score, tips")
          .eq("prompt_id", prompt.id)
          .eq(ownerCol, ownerVal)
          .maybeSingle();
        if (prev.data && prev.data.score !== null) {
          return NextResponse.json(
            {
              error:
                "You already played today. Come back tomorrow for a new prompt!",
              alreadySubmitted: true,
              result: shape(prev.data, !!who.userId),
            },
            { status: 429 },
          );
        }
        return fail(
          409,
          "Your response is still being graded. Give it a moment.",
        );
      }
      throw reserved.error;
    }
    const rowId = reserved.data.id;

    // 4. Wait in line (one grading every few seconds keeps us under the AI
    //    provider's per-minute limit), then grade it. If either step fails,
    //    give the try back.
    try {
      const gotTurn = await waitForGraderTurn();
      if (!gotTurn) {
        await admin.from("submissions").delete().eq("id", rowId);
        return fail(
          503,
          "Lots of players are grading right now. Please try again in a minute. Your try wasn't used.",
        );
      }

      const grade = await gradeResponse(prompt.text, text, difficulty);
      const tipsText = grade.tips.join("\n");
      const saved = await admin
        .from("submissions")
        .update({ score: grade.score, tips: tipsText })
        .eq("id", rowId);
      if (saved.error) throw saved.error;

      const res = NextResponse.json({
        result: shape(
          {
            difficulty,
            response_text: text,
            score: grade.score,
            tips: tipsText,
          },
          !!who.userId,
        ),
        source: grade.source,
      });
      if (who.newGuestId) {
        res.cookies.set(
          GUEST_COOKIE.name,
          who.newGuestId,
          GUEST_COOKIE.options,
        );
      }
      return res;
    } catch (err) {
      console.error("Grading failed:", err);
      await admin.from("submissions").delete().eq("id", rowId);
      return fail(
        502,
        "The grader had a problem. Your try wasn't used, so please try again.",
      );
    }
  } catch (err) {
    console.error("POST /api/grade failed:", err);
    return fail(500, "Something went wrong. Please try again.");
  }
}
