import { GoogleGenAI } from "@google/genai";

// The "day" flips at midnight in this timezone (not UTC).
const TIMEZONE = "America/Chicago";

export function getTodayKey(): string {
  // en-CA formats dates as YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

// Used whenever there is no Gemini API key (or Gemini fails), so the whole
// site works for free while you build.
export const MOCK_PROMPTS = [
  "Should schools start later in the morning?",
  "Should students be allowed to use phones during the school day?",
  "Is homework helpful or harmful for learning?",
  "Should school lunch be free for every student?",
  "Is it better to read the book first or watch the movie first?",
  "Should students have a say in school rules?",
  "Are video games a good use of free time?",
  "Should schools replace paper textbooks with tablets?",
  "Is it more important to be kind or to be honest?",
  "Should kids have a daily limit on screen time?",
  "Is space exploration worth the cost?",
  "Should every student be required to learn a second language?",
  "Is a four-day school week better than a five-day week?",
  "Should recess be longer?",
  "Are zoos good for animals?",
  "Should students be graded on effort or on results?",
  "Is social media good for teenagers?",
  "Should cities build more bike lanes even if it means less parking?",
  "Is it better to live in a big city or a small town?",
  "Should schools require a class on money and budgeting?",
  "Should students wear uniforms?",
  "Is having a pet a good way to learn responsibility?",
  "Should AI tools be allowed for school assignments?",
  "Is competition good or bad for kids?",
  "Is it better to share or rent things than to buy them?",
  "Should people be required to recycle?",
  "Is learning to cook as important as learning math?",
  "Should museums be free for everyone?",
  "Do tests show what students really know?",
  "Is it better to have many friends or a few close ones?",
];

function pickMock(): string {
  const days = Math.floor(
    Date.parse(`${getTodayKey()}T00:00:00Z`) / 86_400_000,
  );
  return MOCK_PROMPTS[days % MOCK_PROMPTS.length];
}

const SYSTEM = `You write one debate prompt per day for students ages 12 to 18 practicing Claim-Evidence-Reasoning writing.
Rules:
- One debatable question with two reasonable sides, answerable in a short paragraph.
- Everyday topics: school, technology, community, health, environment, ethics, fun.
- No current politicians or parties, no religion, no violence, nothing sexual, nothing graphic.
- Output ONLY the question, one or two sentences, with no preface or quotation marks.`;

export async function generatePrompt(
  recent: string[],
): Promise<{ text: string; source: "gemini" | "mock" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: pickMock(), source: "mock" };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const avoid = recent.length
      ? `Do not repeat or closely resemble these recent prompts:\n- ${recent.join("\n- ")}`
      : "";
    const response = await ai.models.generateContent({
      // Model names change over time. Set GEMINI_MODEL in .env.local to switch
      // without touching code.
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: `Write today's prompt. ${avoid}`,
      config: {
        systemInstruction: SYSTEM,
        // Generous on purpose: newer Gemini models can spend part of this
        // limit "thinking" before they write the answer.
        maxOutputTokens: 1024,
      },
    });
    const text = (response.text ?? "")
      .trim()
      .replace(/^["\u201c]|["\u201d]$/g, "");
    if (text.length < 10 || text.length > 300) throw new Error("Bad prompt");
    return { text, source: "gemini" };
  } catch (err) {
    console.error("Gemini prompt failed, using a saved prompt instead:", err);
    return { text: pickMock(), source: "mock" };
  }
}
