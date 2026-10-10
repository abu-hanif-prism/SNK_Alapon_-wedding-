"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import { useSession } from "./session";
import { Brand, Notice, Action } from "./ui";
import assets from "@/lib/figma-assets.json";
export function AuthScreen({
  mode = "register",
}: {
  mode?: "register" | "login";
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const { login } = useSession();
  const router = useRouter();
  const register = mode === "register";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const d = await request<{ user: User; accessToken: string }>(
        register ? "/auth/register" : "/auth/login",
        "POST",
        body,
        false,
      );
      login(d.user, d.accessToken);
      router.push(
        d.user.role === "ADMIN"
          ? "/admin"
          : register
            ? "/verify"
            : "/dashboard",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="topbar">
        <Brand />
        <nav>
          <Link href="/templates">Explore styles</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main id="main" className="welcome">
        <section className="welcome-copy">
          <div className="eyebrow">Made for your once-in-a-lifetime</div>
          <h1>
            {register
              ? "A home for your wedding memories"
              : "Welcome back to your memories"}
          </h1>
          <p>
            Collect the moments you missed. Bring them together in a beautiful
            keepsake of your day.
          </p>
          <form className="panel form" onSubmit={submit}>
            <h2>
              {register ? "Create your wedding space" : "Sign in to your space"}
            </h2>
            {register && (
              <>
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    placeholder="Your full name"
                  />
                </label>
                <label>
                  Bangladesh mobile number
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+880 1712 345678"
                    required
                  />
                </label>
              </>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <div style={{ position: "relative" }}>
                <input
                  style={{ paddingRight: 65 }}
                  aria-label="Password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={register ? 8 : 1}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className="text-button"
                  style={{ position: "absolute", right: 16, top: 5 }}
                  onClick={() => setShow(!show)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <Notice error>{error}</Notice>
            <button className="button" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            </button>
            <Link
              style={{ textAlign: "center", fontSize: 14 }}
              href={register ? "/login" : "/register"}
            >
              {register
                ? "Already have an account? Sign in"
                : "New here? Create your space"}
            </Link>
          </form>
          <div className="signature-links">
            <Link href="/preview/minimal">The Minimal Edit</Link>
            <Link href="/preview/premiere">The Premiere</Link>
          </div>
        </section>
        <aside className="welcome-photo">
          <img
            src={assets["15:1887"].imgHeroBanner}
            alt="A couple celebrating their wedding in a sunlit garden"
          />
        </aside>
      </main>
    </>
  );
}
export function VerifyPhone() {
  const [message, setMessage] = useState("");
  return (
    <main id="main" className="container" style={{ maxWidth: 580 }}>
      <Brand />
      <div style={{ marginTop: 50 }} className="eyebrow">
        A little peace of mind
      </div>
      <h1>Verify your mobile</h1>
      <p>
        We will send a six-digit verification code to your registered Bangladesh
        mobile number.
      </p>
      <Action
        onClick={async () => {
          await request("/auth/phone/send-code", "POST");
          setMessage("Your code is on its way.");
        }}
      >
        Send verification code
      </Action>
      <form
        className="form panel"
        style={{ marginTop: 24 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const code = new FormData(e.currentTarget).get("code");
          try {
            await request("/auth/phone/verify", "POST", { code });
            setMessage("Mobile verified. You are ready to create your event.");
          } catch (e) {
            setMessage(errorMessage(e));
          }
        }}
      >
        <label>
          Verification code
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
        </label>
        <button className="button">Verify mobile</button>
      </form>
      <Notice>{message}</Notice>
      <Link className="button secondary" href="/dashboard">
        Continue to dashboard
      </Link>
    </main>
  );
}
