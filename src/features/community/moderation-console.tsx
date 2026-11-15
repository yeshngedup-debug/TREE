"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  communityReportReasonLabels,
  formatPostDate,
  type CommunityModerationOverview,
  type ModerationAction,
} from "@/lib/community";

type Payload = {
  overview?: CommunityModerationOverview;
  actor?: {
    kind: "staff" | "account";
    label: string;
    role: "staff" | "moderator" | "admin";
  };
  error?: string;
};

export function ModerationConsole() {
  const [overview, setOverview] = useState<CommunityModerationOverview | null>(
    null,
  );
  const [actor, setActor] = useState<Payload["actor"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    return fetch("/api/community/moderation", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as Payload;
        if (!response.ok || !result.overview)
          throw new Error(
            result.error || "Sign in with a moderator or staff account.",
          );
        setOverview(result.overview);
        setActor(result.actor ?? null);
        setError("");
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : "Something went wrong.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(action: ModerationAction, key: string) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/community/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = (await response.json().catch(() => ({}))) as Payload;
      if (!response.ok || !result.overview)
        throw new Error(result.error || "That action could not be completed.");
      setOverview(result.overview);
      setNotice("Moderation action saved.");
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      return false;
    } finally {
      setBusy("");
    }
  }

  if (loading && !overview)
    return (
      <div className="moderation-loading" role="status">
        <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
        Loading moderation queue…
      </div>
    );

  if (!overview)
    return (
      <section className="community-panel moderation-gate">
        <ShieldCheck size={24} aria-hidden="true" />
        <h1>Moderation workspace</h1>
        <p>
          This page is for community moderators and staff. Sign in with a
          moderator account, or use the staff console.
        </p>
        {error ? (
          <p className="community-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="moderation-gate-actions">
          <Link
            href="/create?mode=login&next=%2Fadmin%2Fcommunity"
            className="community-submit inline-flex items-center justify-center"
          >
            Sign in as moderator
          </Link>
          <Link href="/admin" className="community-signout inline-flex items-center">
            Staff console
          </Link>
        </div>
      </section>
    );

  const { counts } = overview;
  const canManage = actor?.kind === "staff" || actor?.role === "admin";

  return (
    <div className="moderation-console">
      <header className="moderation-head">
        <div>
          <p className="eyebrow text-foreground/45">Community care</p>
          <h1>Moderation workspace</h1>
          <p>
            Signed in as {actor?.label || "a moderator"}. Published posts appear
            immediately, so review reports and keep the grove healthy.
          </p>
        </div>
        <div className="moderation-head-actions">
          <Link href="/admin" className="community-signout inline-flex items-center gap-2">
            <ArrowLeft size={14} aria-hidden="true" /> Staff console
          </Link>
          <button
            type="button"
            className="community-signout inline-flex items-center gap-2"
            onClick={() => {
              setLoading(true);
              setNotice("");
              void load();
            }}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        </div>
      </header>

      {error ? (
        <p className="community-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="community-saved" role="status">
          {notice}
        </p>
      ) : null}

      <dl className="moderation-counts">
        {[
          ["Open reports", counts.openReports],
          ["Hidden posts", counts.hiddenPosts],
          ["Hidden comments", counts.hiddenComments],
          ["Suspended accounts", counts.suspendedAccounts],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="moderation-section" aria-labelledby="reports-title">
        <div className="moderation-section-head">
          <h2 id="reports-title">Reports</h2>
          <span>{overview.reports.length} recent</span>
        </div>
        {overview.reports.length ? (
          <ul className="moderation-list">
            {overview.reports.map((report) => (
              <li key={report.id} className="moderation-item">
                <div className="moderation-item-head">
                  <span className={`moderation-status status-${report.status}`}>
                    {report.status}
                  </span>
                  <strong>{communityReportReasonLabels[report.reason]}</strong>
                  <time dateTime={report.createdAt}>
                    {formatPostDate(report.createdAt)}
                  </time>
                </div>
                <p className="moderation-meta">
                  Reported by @{report.reporter.username}
                  {report.post ? (
                    <>
                      {" · "}
                      <Link href={`/posts/${report.post.slug}`}>
                        {report.post.title} <ArrowUpRight size={11} aria-hidden="true" />
                      </Link>
                    </>
                  ) : null}
                  {report.comment ? (
                    <>
                      {" · "}
                      <Link href={`/posts/${report.comment.postSlug}`}>
                        comment on post <ArrowUpRight size={11} aria-hidden="true" />
                      </Link>
                    </>
                  ) : null}
                </p>
                {report.detail ? <p>{report.detail}</p> : null}
                {report.comment ? (
                  <blockquote>{report.comment.body}</blockquote>
                ) : null}
                {report.status === "open" ? (
                  <div className="moderation-actions">
                    <button
                      type="button"
                      disabled={busy === `report:${report.id}`}
                      onClick={() =>
                        void send(
                          {
                            action: "report_status",
                            target: report.id,
                            status: "resolved",
                            note: "",
                          },
                          `report:${report.id}`,
                        )
                      }
                    >
                      <Check size={13} aria-hidden="true" /> Resolve
                    </button>
                    <button
                      type="button"
                      disabled={busy === `report:${report.id}`}
                      onClick={() =>
                        void send(
                          {
                            action: "report_status",
                            target: report.id,
                            status: "dismissed",
                            note: "",
                          },
                          `report:${report.id}`,
                        )
                      }
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="community-hint">No reports have been filed.</p>
        )}
      </section>

      <section className="moderation-section" aria-labelledby="posts-title">
        <div className="moderation-section-head">
          <h2 id="posts-title">Posts</h2>
          <span>Newest first</span>
        </div>
        <ul className="moderation-list">
          {overview.posts.map((post) => (
            <li key={post.slug} className="moderation-item">
              <div className="moderation-item-head">
                <span className={`moderation-status status-${post.status}`}>
                  {post.status}
                </span>
                {post.featured ? (
                  <span className="community-featured">
                    <Star size={11} aria-hidden="true" /> Featured
                  </span>
                ) : null}
                <strong>
                  <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                </strong>
                <time dateTime={post.createdAt}>
                  {formatPostDate(post.createdAt)}
                </time>
              </div>
              <p className="moderation-meta">
                @{post.author}
                {post.reportCount
                  ? ` · ${post.reportCount} open report${post.reportCount === 1 ? "" : "s"}`
                  : ""}
              </p>
              <div className="moderation-actions">
                {post.status !== "published" ? (
                  <button
                    type="button"
                    disabled={busy === `post:${post.slug}`}
                    onClick={() =>
                      void send(
                        {
                          action: "post_status",
                          target: post.slug,
                          status: "published",
                          note: "",
                        },
                        `post:${post.slug}`,
                      )
                    }
                  >
                    <Eye size={13} aria-hidden="true" /> Publish
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === `post:${post.slug}`}
                    onClick={() =>
                      void send(
                        {
                          action: "post_status",
                          target: post.slug,
                          status: "hidden",
                          note: "",
                        },
                        `post:${post.slug}`,
                      )
                    }
                  >
                    <EyeOff size={13} aria-hidden="true" /> Hide
                  </button>
                )}
                {post.status === "published" ? (
                  <button
                    type="button"
                    disabled={busy === `feature:${post.slug}`}
                    onClick={() =>
                      void send(
                        {
                          action: "feature",
                          target: post.slug,
                          featured: !post.featured,
                          note: "",
                        },
                        `feature:${post.slug}`,
                      )
                    }
                  >
                    <Star size={13} aria-hidden="true" />
                    {post.featured ? "Unfeature" : "Feature"}
                  </button>
                ) : null}
                {post.status !== "removed" ? (
                  <button
                    type="button"
                    className="moderation-danger"
                    disabled={busy === `post:${post.slug}`}
                    onClick={() =>
                      void send(
                        {
                          action: "post_status",
                          target: post.slug,
                          status: "removed",
                          note: "",
                        },
                        `post:${post.slug}`,
                      )
                    }
                  >
                    <Trash2 size={13} aria-hidden="true" /> Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="moderation-section" aria-labelledby="comments-title">
        <div className="moderation-section-head">
          <h2 id="comments-title">Hidden comments</h2>
          <span>{overview.comments.length} recent</span>
        </div>
        {overview.comments.length ? (
          <ul className="moderation-list">
            {overview.comments.map((comment) => (
              <li key={comment.id} className="moderation-item">
                <div className="moderation-item-head">
                  <span className={`moderation-status status-${comment.status}`}>
                    {comment.status}
                  </span>
                  <strong>@{comment.author}</strong>
                  <time dateTime={comment.createdAt}>
                    {formatPostDate(comment.createdAt)}
                  </time>
                </div>
                <p className="moderation-meta">
                  <Link href={`/posts/${comment.postSlug}`}>
                    {comment.postTitle} <ArrowUpRight size={11} aria-hidden="true" />
                  </Link>
                </p>
                <blockquote>{comment.body}</blockquote>
                <div className="moderation-actions">
                  <button
                    type="button"
                    disabled={busy === `comment:${comment.id}`}
                    onClick={() =>
                      void send(
                        {
                          action: "comment_status",
                          target: comment.id,
                          status: "published",
                          note: "",
                        },
                        `comment:${comment.id}`,
                      )
                    }
                  >
                    <Eye size={13} aria-hidden="true" /> Restore
                  </button>
                  {comment.status !== "removed" ? (
                    <button
                      type="button"
                      className="moderation-danger"
                      disabled={busy === `comment:${comment.id}`}
                      onClick={() =>
                        void send(
                          {
                            action: "comment_status",
                            target: comment.id,
                            status: "removed",
                            note: "",
                          },
                          `comment:${comment.id}`,
                        )
                      }
                    >
                      <Trash2 size={13} aria-hidden="true" /> Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="community-hint">No hidden or removed comments.</p>
        )}
      </section>

      <section className="moderation-section" aria-labelledby="accounts-title">
        <div className="moderation-section-head">
          <h2 id="accounts-title">Accounts</h2>
          <span>{overview.accounts.length} recent</span>
        </div>
        <ul className="moderation-list">
          {overview.accounts.map((account) => (
            <li key={account.username} className="moderation-item">
              <div className="moderation-item-head">
                <span className={`moderation-status status-${account.status}`}>
                  {account.status}
                </span>
                <strong>
                  <UserRound size={13} aria-hidden="true" /> @{account.username}
                </strong>
                <span className="moderation-meta">{account.displayName}</span>
                <time dateTime={account.createdAt}>
                  {formatPostDate(account.createdAt)}
                </time>
              </div>
              <p className="moderation-meta">
                {account.role} · {account.postCount} published
              </p>
              {canManage ? (
                <div className="moderation-actions">
                  <label className="moderation-role">
                    <span className="sr-only">
                      Role for @{account.username}
                    </span>
                    <select
                      defaultValue={account.role}
                      disabled={busy === `role:${account.username}`}
                      onChange={(event) =>
                        void send(
                          {
                            action: "account_role",
                            target: account.username,
                            role: event.target.value as
                              | "member"
                              | "moderator"
                              | "admin",
                            note: "",
                          },
                          `role:${account.username}`,
                        )
                      }
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  {account.status === "active" ? (
                    <button
                      type="button"
                      className="moderation-danger"
                      disabled={busy === `account:${account.username}`}
                      onClick={() =>
                        void send(
                          {
                            action: "account_status",
                            target: account.username,
                            status: "suspended",
                            note: "",
                          },
                          `account:${account.username}`,
                        )
                      }
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === `account:${account.username}`}
                      onClick={() =>
                        void send(
                          {
                            action: "account_status",
                            target: account.username,
                            status: "active",
                            note: "",
                          },
                          `account:${account.username}`,
                        )
                      }
                    >
                      Restore
                    </button>
                  )}
                </div>
              ) : (
                <p className="moderation-meta">
                  Only staff or a community admin can change roles or suspend
                  an account.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="moderation-section" aria-labelledby="categories-title">
        <div className="moderation-section-head">
          <h2 id="categories-title">Categories</h2>
          <span>
            {canManage ? "Labels and descriptions" : "Read only for moderators"}
          </span>
        </div>
        <div className="moderation-categories">
          {overview.categories.map((category) =>
            canManage ? (
              <CategoryForm
                key={category.slug}
                slug={category.slug}
                label={category.label}
                description={category.description}
                busy={busy === `category:${category.slug}`}
                onSave={(label, description) =>
                  send(
                    {
                      action: "category",
                      slug: category.slug,
                      label,
                      description,
                      note: "",
                    },
                    `category:${category.slug}`,
                  )
                }
              />
            ) : (
              <div key={category.slug} className="moderation-category">
                <p className="moderation-meta">/{category.slug}</p>
                <strong>{category.label}</strong>
                <p className="moderation-meta">{category.description}</p>
              </div>
            ),
          )}
        </div>
        {canManage ? (
          <NewCategoryForm
            busy={busy === "category:new"}
            onCreate={(slug, label, description) =>
              send(
                {
                  action: "category",
                  slug,
                  label,
                  description,
                  note: "",
                },
                "category:new",
              )
            }
          />
        ) : (
          <p className="community-hint">
            Categories are managed by staff and community admins.
          </p>
        )}
      </section>

      <section className="moderation-section" aria-labelledby="activity-title">
        <div className="moderation-section-head">
          <h2 id="activity-title">Recent moderation activity</h2>
        </div>
        {overview.recent.length ? (
          <ul className="moderation-activity">
            {overview.recent.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action}</strong> {entry.targetKind}{" "}
                <code>{entry.targetId}</code> by {entry.actorLabel}
                {entry.note ? ` — ${entry.note}` : ""}
                <time dateTime={entry.createdAt}>
                  {formatPostDate(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="community-hint">No moderation actions yet.</p>
        )}
      </section>
    </div>
  );
}

function CategoryForm({
  slug,
  label,
  description,
  busy,
  onSave,
}: {
  slug: string;
  label: string;
  description: string;
  busy: boolean;
  onSave: (label: string, description: string) => void;
}) {
  const [nextLabel, setNextLabel] = useState(label);
  const [nextDescription, setNextDescription] = useState(description);
  return (
    <form
      className="community-form moderation-category"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(nextLabel.trim(), nextDescription.trim());
      }}
    >
      <p className="moderation-meta">/{slug}</p>
      <label className="community-field">
        <span>Label</span>
        <input
          value={nextLabel}
          onChange={(event) => setNextLabel(event.target.value)}
          required
          maxLength={60}
        />
      </label>
      <label className="community-field">
        <span>Description</span>
        <textarea
          value={nextDescription}
          onChange={(event) => setNextDescription(event.target.value)}
          maxLength={280}
          rows={2}
        />
      </label>
      <button type="submit" className="community-submit" disabled={busy}>
        {busy ? "Saving…" : "Save category"}
      </button>
    </form>
  );
}

function NewCategoryForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (
    slug: string,
    label: string,
    description: string,
  ) => Promise<boolean>;
}) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      className="community-form moderation-category moderation-category-new"
      onSubmit={async (event) => {
        event.preventDefault();
        const created = await onCreate(
          slug.trim().toLowerCase(),
          label.trim(),
          description.trim(),
        );
        if (!created) return;
        setSlug("");
        setLabel("");
        setDescription("");
      }}
    >
      <p className="moderation-meta">Add a category</p>
      <label className="community-field">
        <span>Slug</span>
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          pattern="[a-z0-9-]{2,48}"
          placeholder="e.g. water"
          minLength={2}
          maxLength={48}
          required
        />
        <small>Lowercase letters, numbers and hyphens.</small>
      </label>
      <label className="community-field">
        <span>Label</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          minLength={2}
          maxLength={60}
          required
        />
      </label>
      <label className="community-field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={280}
          rows={2}
        />
      </label>
      <button type="submit" className="community-submit" disabled={busy}>
        {busy ? "Creating…" : "Create category"}
      </button>
    </form>
  );
}
