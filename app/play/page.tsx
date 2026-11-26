"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DIFFICULTIES,
  MIN_WORDS,
  WORD_LIMIT,
  countWords,
  type Difficulty,
} from "@/lib/limits";

const STARTER = "My claim is...\nMy evidence is...\nMy reasoning is...";

type Result = {
  score: number;
  difficulty: Difficulty;
  response: string;
  tips: string[];
  tipsLocked: boolean;
  source?: "gemini" | "mock";
};

export default function Play() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [response, setResponse] = useState(STARTER);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptError, setPromptError] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = result !== null;
  const words = countWords(response);
  const overLimit = words > WORD_LIMIT;
  const tooShort = words < MIN_WORDS;

  // Load today's prompt
  useEffect(() => {
    let cancelled = false;
    fetch("/api/prompt")
      .then((res) => {
        if (!res.ok) throw new Error("Prompt request failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setPromptText(data.prompt);
      })
      .catch(() => {
        if (!cancelled) setPromptError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // If this person already played today, show their result
  useEffect(() => {
    let cancelled = false;
    fetch("/api/grade")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.submitted) return;
        setResult(data.result);
        setResponse(data.result.response);
        setDifficulty(data.result.difficulty);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, difficulty }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResult({ ...data.result, source: data.source });
      } else if (data.alreadySubmitted && data.result) {
        setResult(data.result);
        setResponse(data.result.response);
        setDifficulty(data.result.difficulty);
        setError(data.error);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="frame" data-difficulty={difficulty}>
      {/* LEFT PANEL: difficulty, prompt, score */}
      <section className="panel left">
        <Link href="/" className="home-link">
          &larr; Home
        </Link>

        <div className="difficulty" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              className={`diff diff-${level} ${
                difficulty === level ? "active" : ""
              }`}
              onClick={() => setDifficulty(level)}
              aria-pressed={difficulty === level}
              disabled={locked || submitting}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="box prompt-box">
          <h2>Prompt</h2>
          <p>
            {promptError
              ? "Couldn't load today's prompt. Refresh to try again."
              : (promptText ?? "Loading today's prompt...")}
          </p>
        </div>

        <div className="box score-box" aria-live="polite">
          <h2>You got an:</h2>
          <p className="score">
            <span>{result ? result.score : "–"}</span>/10
          </p>

          {!result && (
            <p className="tips">
              {submitting
                ? "Grading..."
                : "Submit your response to get graded."}
            </p>
          )}

          {result && result.tipsLocked && (
            <p className="tips">
              <Link href="/" className="tips-link">
                Log in
              </Link>{" "}
              on the home page to see improvement tips.
            </p>
          )}

          {result && !result.tipsLocked && result.tips.length > 0 && (
            <ul className="tips tips-list">
              {result.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          )}

          {result?.source === "mock" && (
            <p className="note">
              Practice mode: this score is simulated, not graded by AI.
            </p>
          )}
        </div>
      </section>

      {/* RIGHT PANEL: CER writing area */}
      <section className="panel right">
        <textarea
          className="cer"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          readOnly={locked}
          aria-label="Write your claim, evidence, and reasoning"
          spellCheck
        />
        <div className="meta">
          <span className={overLimit ? "over" : ""}>
            {words} / {WORD_LIMIT} words
            {!locked && tooShort ? ` (min ${MIN_WORDS})` : ""}
          </span>
          <button
            className="submit"
            onClick={submit}
            disabled={locked || submitting || overLimit || tooShort}
          >
            {submitting ? "Grading..." : locked ? "Submitted" : "Submit"}
          </button>
        </div>

        {locked && !error && (
          <p className="note" role="status">
            You played today. Come back tomorrow for a new prompt!
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
