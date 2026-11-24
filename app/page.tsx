"use client";

import { useState } from "react";

type Difficulty = "easy" | "medium" | "hard";

const STARTER = "My claim is...\nMy evidence is...\nMy reasoning is...";
const WORD_LIMIT = 500;

const countWords = (text: string) =>
  text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

export default function Home() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [response, setResponse] = useState(STARTER);

  const words = countWords(response);
  const overLimit = words > WORD_LIMIT;

  return (
    <main className="frame" data-difficulty={difficulty}>
      {/* LEFT PANEL: difficulty, prompt, score */}
      <section className="panel left">
        <div className="difficulty" role="group" aria-label="Difficulty">
          {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
            <button
              key={level}
              className={`diff diff-${level} ${
                difficulty === level ? "active" : ""
              }`}
              onClick={() => setDifficulty(level)}
              aria-pressed={difficulty === level}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="box prompt-box">
          <h2>Prompt</h2>
          <p>
            Placeholder: today&apos;s debate prompt will appear here. (Day 4)
          </p>
        </div>

        <div className="box score-box">
          <h2>You got an:</h2>
          <p className="score">
            <span>–</span>/10
          </p>
          <p className="tips">Improvement tips... (Day 5)</p>
        </div>
      </section>

      {/* RIGHT PANEL: CER writing area */}
      <section className="panel right">
        <textarea
          className="cer"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          aria-label="Write your claim, evidence, and reasoning"
          spellCheck
        />
        <div className="meta">
          <span className={overLimit ? "over" : ""}>
            {words} / {WORD_LIMIT} words
          </span>
          <button className="submit" disabled={overLimit || words === 0}>
            Submit
          </button>
        </div>
      </section>
    </main>
  );
}
