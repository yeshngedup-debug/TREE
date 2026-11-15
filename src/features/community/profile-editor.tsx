"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommunityAccount } from "@/lib/community";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/community/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className="community-signout"
      onClick={signOut}
      disabled={pending}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function ProfileEditor({ account }: { account: CommunityAccount }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/community/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.get("displayName"),
          bio: data.get("bio"),
          avatarUrl: data.get("avatarUrl"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not save your profile.");
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="community-editor">
      <summary>Edit profile</summary>
      <form className="community-form" onSubmit={submit}>
        <label className="community-field">
          <span>Display name</span>
          <input
            name="displayName"
            required
            maxLength={60}
            defaultValue={account.displayName}
          />
        </label>
        <label className="community-field">
          <span>Short biography</span>
          <textarea
            name="bio"
            rows={4}
            maxLength={280}
            defaultValue={account.bio}
            placeholder="What you care about, and what you are building."
          />
        </label>
        <label className="community-field">
          <span>Profile picture URL (optional)</span>
          <input
            name="avatarUrl"
            type="url"
            maxLength={500}
            defaultValue={account.avatarUrl}
            placeholder="https://example.org/me.jpg"
          />
          <small>An https link to an image you have the right to use.</small>
        </label>
        {error ? (
          <p className="community-error" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="community-saved" role="status">
            Profile saved.
          </p>
        ) : null}
        <button type="submit" className="community-submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </details>
  );
}
