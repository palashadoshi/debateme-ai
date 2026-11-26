import { NextResponse } from "next/server";
import { getOrCreateTodayPrompt } from "@/lib/dailyPrompt";

export async function GET() {
  try {
    const prompt = await getOrCreateTodayPrompt();
    return NextResponse.json({ prompt: prompt.text, date: prompt.date });
  } catch (err) {
    console.error("GET /api/prompt failed:", err);
    return NextResponse.json(
      { error: "Could not load prompt" },
      { status: 500 },
    );
  }
}
