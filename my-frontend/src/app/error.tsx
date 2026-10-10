"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="auth-required">
      <h1>A little interruption.</h1>
      <p>Something went wrong while opening this page.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
