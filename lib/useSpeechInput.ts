"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// Total microphone time allowed per response.
export const SPEECH_SECONDS = 120;

// The browser's speech types aren't in TypeScript's built-in list, so we
// describe just the parts we use.
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export type Support = "unknown" | "yes" | "no";

const noopSubscribe = () => () => {};

function friendlyError(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Click the lock icon in your address bar to allow it.";
    case "no-speech":
      return "Didn't hear anything. Try again a little closer to your mic.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Voice input couldn't reach your browser's speech service. You can type instead.";
    case "aborted":
      return null; // we stopped it on purpose
    default:
      return "Voice input had a problem. You can type instead.";
  }
}

export function useSpeechInput(onFinalText: (text: string) => void) {
  // "unknown" on the server, then "yes" or "no" once we're in the browser.
  const support = useSyncExternalStore<Support>(
    noopSubscribe,
    () => (getCtor() ? "yes" : "no"),
    () => "unknown",
  );

  const [listening, setListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SPEECH_SECONDS);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinalText);
  useEffect(() => {
    onFinalRef.current = onFinalText;
  });

  // Count down only while the mic is on.
  useEffect(() => {
    if (!listening) return;
    const id = window.setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [listening]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  // Out of time: turn the mic off.
  useEffect(() => {
    if (listening && secondsLeft <= 0) stop();
  }, [listening, secondsLeft, stop]);

  // Leaving the page: turn the mic off.
  useEffect(() => {
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    if (recRef.current || secondsLeft <= 0) return;
    const Ctor = getCtor();
    if (!Ctor) return;

    setError(null);
    setInterim("");

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText.trim()) onFinalRef.current(finalText.trim());
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      const message = friendlyError(e.error);
      if (message) setError(message);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setError("Couldn't start the microphone. Please try again.");
    }
  }, [secondsLeft]);

  return { support, listening, secondsLeft, interim, error, start, stop };
}
