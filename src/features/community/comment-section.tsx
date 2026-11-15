"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Trash2 } from "lucide-react";
import {
  communityReportReasonLabels,
  communityReportReasons,
  formatPostDate,
  type CommunityComment,
  type CommunityReportReason,
} from "@/lib/community";
import { CommunityAvatar } from "./post-card";

function CommentReport({ commentId }: { commentId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/community/comments/${commentId}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: data.get("reason") as CommunityReportReason,
            detail: data.get("detail") ?? "",
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not send that report.");
      setState("sent");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
      setState("idle");
    }
  }

  return (
    <details className="comment-report">
      <summary>
        <Flag size={13} aria-hidden="true" /> Report
      </summary>
      {state === "sent" ? (
        <p className="community-saved" role="status">
          A moderator will review this comment.
        </p>
      ) : (
        <form className="community-form comment-report-form" onSubmit={report}>
          <label className="community-field">
            <span>Reason</span>
            <select name="reason" required defaultValue="harassment">
              {communityReportReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {communityReportReasonLabels[reason]}
                </option>
              ))}
            </select>
          </label>
          <label className="community-field">
            <span>Anything else? (optional)</span>
            <textarea name="detail" rows={2} maxLength={500} />
          </label>
          {error ? (
            <p className="community-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="community-submit"
            disabled={state === "sending"}
          >
            {state === "sending" ? "Sending…" : "Send report"}
          </button>
        </form>
      )}
    </details>
  );
}

export function CommentSection({
  slug,
  initialComments,
  signedIn,
  currentUsername,
}: {
  slug: string;
  initialComments: CommunityComment[];
  signedIn: boolean;
  currentUsername: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  const loginHref = `/create?mode=login&next=${encodeURIComponent(`/posts/${slug}`)}`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/community/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        comment?: CommunityComment;
        error?: string;
      };
      if (!response.ok || !result.comment)
        throw new Error(result.error || "We could not add your comment.");
      setComments((current) => [...current, result.comment as CommunityComment]);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function remove(commentId: string) {
    setDeleting(commentId);
    setError("");
    try {
      const response = await fetch(`/api/community/comments/${commentId}`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "We could not delete that comment.");
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setDeleting("");
    }
  }

  return (
    <section className="comment-section" aria-labelledby="comments-title">
      <div className="comment-heading">
        <h2 id="comments-title">Conversation</h2>
        <span>
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {signedIn ? (
        <form className="community-form comment-form" onSubmit={submit}>
          <label className="community-field">
            <span>Add a comment</span>
            <textarea
              name="body"
              rows={3}
              required
              minLength={2}
              maxLength={1200}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Build on this idea, share context, or ask a question."
            />
            <small>Plain text. 2–1200 characters.</small>
          </label>
          {error ? (
            <p className="community-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="community-submit"
            disabled={pending || !draft.trim()}
          >
            {pending ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="community-hint">
          <Link href={loginHref}>Sign in</Link> to join the conversation. Reading
          stays open to everyone.
        </p>
      )}

      {comments.length ? (
        <ol className="comment-list">
          {comments.map((comment) => {
            const own = comment.author.username === currentUsername;
            return (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <CommunityAvatar author={comment.author} size={32} />
                  <div>
                    <strong>{comment.author.displayName}</strong>
                    <span>
                      @{comment.author.username} ·{" "}
                      <time dateTime={comment.createdAt}>
                        {formatPostDate(comment.createdAt)}
                      </time>
                    </span>
                  </div>
                </div>
                <p>{comment.body}</p>
                <div className="comment-actions">
                  {own ? (
                    <button
                      type="button"
                      onClick={() => remove(comment.id)}
                      disabled={deleting === comment.id}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      {deleting === comment.id ? "Deleting…" : "Delete"}
                    </button>
                  ) : signedIn ? (
                    <CommentReport commentId={comment.id} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="community-hint">
          No comments yet. Start the conversation with something useful.
        </p>
      )}
    </section>
  );
}
