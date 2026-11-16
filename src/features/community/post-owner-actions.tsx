"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

export function PostOwnerActions({
  slug,
  username,
}: {
  slug: string;
  username: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/community/posts/${slug}`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not remove that post.");
      router.push(`/u/${username}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <div className="post-owner-actions">
      <Link href={`/posts/${slug}/edit`} className="post-owner-link">
        <Pencil size={14} aria-hidden="true" /> Edit post
      </Link>
      {confirming ? (
        <span className="post-owner-confirm" aria-live="polite">
          Remove this post? It leaves Discover and the Living Tree.
          <button
            type="button"
            className="post-owner-link post-owner-remove"
            onClick={remove}
            disabled={pending}
          >
            <Trash2 size={14} aria-hidden="true" />
            {pending ? "Removing…" : "Yes, remove"}
          </button>
          <button
            type="button"
            className="post-owner-link"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Keep it
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="post-owner-link post-owner-remove"
          onClick={() => setConfirming(true)}
          disabled={pending}
        >
          <Trash2 size={14} aria-hidden="true" />
          Remove
        </button>
      )}
      {error ? (
        <p className="community-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
