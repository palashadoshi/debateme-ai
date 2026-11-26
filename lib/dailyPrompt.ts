import { createAdminClient } from "@/lib/supabase/admin";
import { generatePrompt, getTodayKey } from "@/lib/prompts";

export type TodayPrompt = { id: number; text: string; date: string };

export async function findTodayPrompt(): Promise<TodayPrompt | null> {
  const supabase = createAdminClient();
  const date = getTodayKey();
  const { data, error } = await supabase
    .from("daily_prompts")
    .select("id, prompt_text")
    .eq("prompt_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, text: data.prompt_text, date } : null;
}

// Returns today's prompt, creating and saving it on the first request of the day.
export async function getOrCreateTodayPrompt(): Promise<TodayPrompt> {
  const existing = await findTodayPrompt();
  if (existing) return existing;

  const supabase = createAdminClient();
  const date = getTodayKey();

  const recent = await supabase
    .from("daily_prompts")
    .select("prompt_text")
    .order("prompt_date", { ascending: false })
    .limit(14);

  const { text } = await generatePrompt(
    recent.data?.map((r) => r.prompt_text) ?? [],
  );

  // If two visitors race, the unique date makes the second insert a no-op.
  const saved = await supabase
    .from("daily_prompts")
    .upsert(
      { prompt_date: date, prompt_text: text },
      { onConflict: "prompt_date", ignoreDuplicates: true },
    );
  if (saved.error) throw saved.error;

  const final = await findTodayPrompt();
  if (!final) throw new Error("Prompt missing after save");
  return final;
}
