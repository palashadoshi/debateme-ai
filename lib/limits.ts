// Shared by the browser and the server. Keep this file free of server imports.
export const WORD_LIMIT = 500;
export const MIN_WORDS = 15;
export const MAX_CHARS = 5000; // matches the check in the submissions table

export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === "string" && DIFFICULTIES.includes(value as Difficulty)
  );
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
