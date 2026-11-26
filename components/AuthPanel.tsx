"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (mode === "signup" && password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMessage(error.message);
      else if (!data.session)
        setMessage("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
    }
    setPassword("");
    setBusy(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessage(null);
  }

  if (loading) {
    return <div className="auth" aria-busy="true" />;
  }

  if (user) {
    return (
      <div className="auth">
        <p className="auth-line">Signed in as {user.email}</p>
        <button className="auth-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth-tabs" role="group" aria-label="Login or sign up">
        <button
          type="button"
          className={mode === "signin" ? "tab active" : "tab"}
          onClick={() => setMode("signin")}
          aria-pressed={mode === "signin"}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === "signup" ? "tab active" : "tab"}
          onClick={() => setMode("signup")}
          aria-pressed={mode === "signup"}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
          />
        </label>
        <button className="auth-btn" type="submit" disabled={busy}>
          {mode === "signup" ? "Create account" : "Login"}
        </button>
      </form>

      {message && (
        <p className="auth-msg" role="status">
          {message}
        </p>
      )}
      <p className="auth-hint">Login to unlock improvement tips.</p>
    </div>
  );
}
