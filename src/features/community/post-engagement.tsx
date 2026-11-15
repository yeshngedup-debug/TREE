"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Flag, Heart } from "lucide-react";
import {
  communityReportReasonLabels,
  communityReportReasons,
  type CommunityEngagement,
  type CommunityReportReason,
} from "@/lib/community";

export function PostEngagement({
  slug,
  initial,
  signedIn,
}: {
  slug: string;
  initial: CommunityEngagement;
  signedIn: boolean;
}) {
  const [engagement, setEngagement] = useState(initial);
  const [pending, setPending] = useState<"like" | "bookmark" | null>(null);
  const [error, setError] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [reportError, setReportError] = useState("");
  const loginHref = `/create?mode=login&next=${encodeURIComponent(`/posts/${slug}`)}`;

  async function toggle(kind: "like" | "bookmark") {
    setPending(kind);
    setError("");
    try {
      const response = await fetch(
        `/api/community/posts/${slug}/${kind === "like" ? "like" : "bookmark"}`,
        { method: "POST" },
      );
      const result = (await response.json().catch(() => ({}))) as {
        engagement?: CommunityEngagement;
        bookmarked?: boolean;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not save that just now.");
      if (kind === "like" && result.engagement) setEngagement(result.engagement);
      if (kind === "bookmark" && typeof result.bookmarked === "boolean")
        setEngagement((current) => ({
          ...current,
          bookmarked: result.bookmarked as boolean,
        }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportState("sending");
    setReportError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/community/posts/${slug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: data.get("reason") as CommunityReportReason,
          detail: data.get("detail") ?? "",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not send that report.");
      setReportState("sent");
    } catch (caught) {
      setReportError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
      setReportState("idle");
    }
  }

  return (
    <div className="post-engagement">
      <div className="post-engagement-actions">
        {signedIn ? (
          <button
            type="button"
            className="post-action"
            data-active={engagement.liked}
            aria-pressed={engagement.liked}
            aria-label={`${engagement.liked ? "Unlike" : "Like"} this post`}
            disabled={pending === "like"}
            onClick={() => toggle("like")}
          >
            <Heart
              size={17}
              aria-hidden="true"
              fill={engagement.liked ? "currentColor" : "none"}
            />
            <span>{engagement.likeCount}</span>
          </button>
        ) : (
          <Link
            href={loginHref}
            className="post-action"
            aria-label="Sign in to like this post"
          >
            <Heart size={17} aria-hidden="true" />
            <span>{engagement.likeCount}</span>
          </Link>
        )}

        {signedIn ? (
          <button
            type="button"
            className="post-action"
            data-active={engagement.bookmarked}
            aria-pressed={engagement.bookmarked}
            disabled={pending === "bookmark"}
            onClick={() => toggle("bookmark")}
          >
            <Bookmark
              size={17}
              aria-hidden="true"
              fill={engagement.bookmarked ? "currentColor" : "none"}
            />
            <span>{engagement.bookmarked ? "Saved" : "Save"}</span>
          </button>
        ) : (
          <Link href={loginHref} className="post-action">
            <Bookmark size={17} aria-hidden="true" />
            <span>Save</span>
          </Link>
        )}

        {signedIn ? (
          <details className="post-report">
            <summary>
              <Flag size={15} aria-hidden="true" /> Report
            </summary>
            {reportState === "sent" ? (
              <p className="community-saved" role="status">
                Thank you. A moderator will review this post.
              </p>
            ) : (
              <form className="community-form post-report-form" onSubmit={report}>
                <label className="community-field">
                  <span>Reason</span>
                  <select name="reason" required defaultValue="spam">
                    {communityReportReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {communityReportReasonLabels[reason]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="community-field">
                  <span>Anything else? (optional)</span>
                  <textarea
                    name="detail"
                    rows={3}
                    maxLength={500}
                    placeholder="Add context for the moderators."
                  />
                </label>
                {reportError ? (
                  <p className="community-error" role="alert">
                    {reportError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="community-submit"
                  disabled={reportState === "sending"}
                >
                  {reportState === "sending" ? "Sending…" : "Send report"}
                </button>
              </form>
            )}
          </details>
        ) : null}
      </div>
      {error ? (
        <p className="community-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
