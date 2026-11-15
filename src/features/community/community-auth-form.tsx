"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

type Mode = "signup" | "login";

export function CommunityAuthForm({
  initialMode = "signup",
  next = "",
}: {
  initialMode?: Mode;
  next?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload =
      mode === "signup"
        ? {
            username: data.get("username"),
            displayName: data.get("displayName"),
            password: data.get("password"),
          }
        : {
            username: data.get("username"),
            password: data.get("password"),
          };
    try {
      const response = await fetch(`/api/community/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not sign you in.");
      if (next) router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="community-panel" aria-labelledby="community-auth-title">
      <div className="community-panel-head">
        <p className="eyebrow text-foreground/45">A free community account</p>
        <h1 id="community-auth-title" className="text-3xl tracking-tight md:text-4xl">
          {mode === "signup" ? "Join the grove." : "Welcome back."}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-foreground/60">
          An account lets you publish aspirations and ideas, keep them together
          on your profile, and be credited for what you grow. Sharing a leaf at
          an event stays anonymous and needs no account.
        </p>
      </div>

      <div className="community-switch" role="group" aria-label="Account action">
        <button
          type="button"
          onClick={() => setMode("signup")}
          aria-pressed={mode === "signup"}
        >
          <UserPlus size={15} aria-hidden="true" /> Create account
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          aria-pressed={mode === "login"}
        >
          <LogIn size={15} aria-hidden="true" /> Sign in
        </button>
      </div>

      <form className="community-form" onSubmit={submit}>
        <label className="community-field">
          <span>Username</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={24}
            autoComplete="username"
            pattern="[A-Za-z0-9_]{3,24}"
            placeholder="karma_t"
          />
          <small>3–24 letters, numbers or underscores. This is public.</small>
        </label>

        {mode === "signup" ? (
          <label className="community-field">
            <span>Display name</span>
            <input
              name="displayName"
              required
              maxLength={60}
              autoComplete="name"
              placeholder="Karma Tenzin"
            />
          </label>
        ) : null}

        <label className="community-field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            maxLength={200}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" ? <small>At least 8 characters.</small> : null}
        </label>

        {error ? (
          <p className="community-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="community-submit" disabled={pending}>
          {pending
            ? "Working…"
            : mode === "signup"
              ? "Create my account"
              : "Sign in"}
        </button>
        <p className="community-fineprint">
          No national ID, no email required. Your password is stored only as a
          salted scrypt hash.
        </p>
      </form>
    </section>
  );
}
