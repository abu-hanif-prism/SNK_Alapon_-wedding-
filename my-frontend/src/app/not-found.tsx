import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="auth-required">
      <h1>A page out of place.</h1>
      <p>We could not find that page. Let?s get you back to your story.</p>
      <Link className="button" href="/">
        Back to SNAPNKEEP
      </Link>
    </main>
  );
}
