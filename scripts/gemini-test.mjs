// Times a tiny request on a few Gemini models, outside of your website.
// Run from your project folder:
//   node --env-file=.env.local scripts/gemini-test.mjs
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("No GEMINI_API_KEY found in .env.local");
  process.exit(1);
}

const models = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
];
const LIMIT = 60_000;
const ai = new GoogleGenAI({ apiKey: key });

const giveUp = (ms) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`no answer after ${ms / 1000}s`)), ms),
  );

for (const model of models) {
  const start = Date.now();
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents:
          "Write one debate question for students about school. One sentence.",
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 2048,
        },
      }),
      giveUp(LIMIT),
    ]);
    console.log(
      `${model}: ${Date.now() - start} ms -> ${(res.text ?? "").trim()}`,
    );
  } catch (err) {
    console.log(
      `${model}: FAILED after ${Date.now() - start} ms -> ${err.message}`,
    );
  }
}

// Same request without the SDK, to tell a network problem from an SDK problem.
{
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${models[0]}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello in five words." }] }],
        }),
        signal: AbortSignal.timeout(LIMIT),
      },
    );
    console.log(
      `REST ${models[0]}: HTTP ${res.status} in ${Date.now() - start} ms`,
    );
  } catch (err) {
    console.log(
      `REST ${models[0]}: FAILED after ${Date.now() - start} ms -> ${err.message}`,
    );
  }
}

process.exit(0);
