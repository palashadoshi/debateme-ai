"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="home">
      <div className="home-center">
        <h1 className="home-title small">Something went wrong</h1>
        <button type="button" className="login-btn" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
