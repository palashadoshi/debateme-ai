"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DIFFICULTIES,
  MIN_WORDS,
  WORD_LIMIT,
  countWords,
  type Difficulty,
} from "@/lib/limits";
import { useSpeechInput } from "@/lib/useSpeechInput";

const STARTER = "My claim is...\nMy evidence is...\nMy reasoning is...";

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
  const [slow, setSlow] = useState(false);

  const locked = result !== null;
  const words = countWords(response);
  const overLimit = words > WORD_LIMIT;
  const tooShort = words < MIN_WORDS;

  // Dictation: spoken text is added to the end of the response.
  const appendDictation = useCallback((text: string) => {
    setResponse((prev) => (prev.trimEnd() + " " + text.trim()).trim());
  }, []);
  const speech = useSpeechInput(appendDictation);
  const { listening, stop: stopMic } = speech;

  function toggleMic() {
    if (listening) {
      stopMic();
      return;
    }
    // The starter text would clutter a spoken answer, so clear it if untouched.
    if (response === STARTER) setResponse("");
    speech.start();
  }

  // Turn the mic off when the response is submitted or hits the word limit.
  useEffect(() => {
    if (listening && (locked || words >= WORD_LIMIT)) stopMic();
  }, [listening, locked, words, stopMic]);

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

  // If grading takes a while, tell the player they are waiting in line.
  useEffect(() => {
    if (!submitting) return;
    const id = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [submitting]);

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
                ? slow
                  ? "Lots of players are grading right now. You're in line, hang tight..."
                  : "AI is thinking..."
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
        {speech.support === "yes" && (
          <div className="voice">
            <button
              type="button"
              className={`mic-btn ${listening ? "on" : ""}`}
              onClick={toggleMic}
              aria-pressed={listening}
              disabled={
                locked || submitting || (!listening && speech.secondsLeft <= 0)
              }
            >
              {listening ? "Stop mic" : "Start mic"}
            </button>
            <span className="mic-time">
              {speech.secondsLeft > 0
                ? `${formatTime(speech.secondsLeft)} mic time left`
                : "Mic time used up. You can keep typing!"}
            </span>
          </div>
        )}
        {speech.support === "no" && (
          <p className="note">
            Voice input works in Chrome and Edge. You can still type your
            response!
          </p>
        )}
        {listening && speech.interim && (
          <p className="interim">Hearing: {speech.interim}</p>
        )}
        {speech.error && (
          <p className="error" role="alert">
            {speech.error}
          </p>
        )}

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
            {submitting ? "AI is thinking..." : locked ? "Submitted" : "Submit"}
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
        <p className="note">
          Your response is sent to an AI service to be graded.
          {speech.support === "yes" &&
            " Voice input is handled by your browser's speech service."}
        </p>
      </section>
    </main>
  );
}
