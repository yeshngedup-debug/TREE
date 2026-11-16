"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Sprout } from "lucide-react";
import type {
  CommunityCategory,
  CommunityContentType,
  CommunityPost,
} from "@/lib/community";

export function PostComposer({
  categories,
  initialType = "idea",
  post,
}: {
  categories: CommunityCategory[];
  initialType?: CommunityContentType;
  post?: CommunityPost;
}) {
  const router = useRouter();
  const editing = Boolean(post);
  const [contentType, setContentType] = useState<CommunityContentType>(
    post?.contentType ?? initialType,
  );
  const [category, setCategory] = useState(
    post?.category.slug ?? categories[0]?.slug ?? "",
  );
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [imageUrl, setImageUrl] = useState(post?.imageUrl ?? "");
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const titleShort = title.trim().length > 0 && title.trim().length < 6;
  const bodyShort = body.trim().length > 0 && body.trim().length < 20;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = {
      title,
      body,
      contentType,
      category,
      imageUrl,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 6),
    };
    try {
      const response = await fetch(
        editing
          ? `/api/community/posts/${post?.slug}`
          : "/api/community/posts",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        post?: { slug: string };
        error?: string;
      };
      if (!response.ok || !result.post)
        throw new Error(
          result.error ||
            (editing
              ? "We could not save your changes."
              : "We could not publish your post."),
        );
      router.push(`/posts/${result.post.slug}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <section className="community-panel" aria-labelledby="composer-title">
      <div className="community-panel-head">
        <p className="eyebrow text-soft">
          {editing ? "Edit your post" : "Publish to the community"}
        </p>
        <h1 id="composer-title" className="text-3xl tracking-tight md:text-4xl">
          {editing ? "Refine what you are growing." : "What are you growing?"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-soft">
          {editing
            ? "Saving updates the post and its leaf on the Living Tree. The shared link stays the same."
            : "An aspiration names the future you want. An idea proposes a practical way to reach it. Both become part of the Living Tree."}
        </p>
      </div>

      <form className="community-form" onSubmit={submit}>
        <fieldset className="community-type-picker">
          <legend>Content type</legend>
          <label data-active={contentType === "aspiration"}>
            <input
              type="radio"
              name="contentType"
              value="aspiration"
              checked={contentType === "aspiration"}
              onChange={() => setContentType("aspiration")}
            />
            <Sprout size={18} aria-hidden="true" />
            <span>
              <strong>Aspiration</strong>
              <small>A future you hope to see.</small>
            </span>
          </label>
          <label data-active={contentType === "idea"}>
            <input
              type="radio"
              name="contentType"
              value="idea"
              checked={contentType === "idea"}
              onChange={() => setContentType("idea")}
            />
            <Lightbulb size={18} aria-hidden="true" />
            <span>
              <strong>Idea</strong>
              <small>A practical way to get there.</small>
            </span>
          </label>
        </fieldset>

        <label className="community-field">
          <span>Title</span>
          <input
            name="title"
            required
            minLength={6}
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Offline-first learning for rural schools"
            aria-invalid={titleShort || undefined}
            aria-describedby="composer-title-foot"
          />
          <div
            id="composer-title-foot"
            className="community-field-foot"
            data-short={titleShort || undefined}
          >
            <small className="field-hint">
              {titleShort ? "Needs at least 6 characters." : "6–120 characters."}
            </small>
            <small className="field-counter">{title.length}/120</small>
          </div>
        </label>

        <label className="community-field">
          <span>Category</span>
          <select
            name="category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="community-field">
          <span>Description</span>
          <textarea
            name="body"
            required
            minLength={20}
            maxLength={5000}
            rows={10}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Describe the need, who it serves, and what the first step would look like."
            aria-invalid={bodyShort || undefined}
            aria-describedby="composer-body-foot"
          />
          <div
            id="composer-body-foot"
            className="community-field-foot"
            data-short={bodyShort || undefined}
          >
            <small className="field-hint">
              {bodyShort
                ? "Needs at least 20 characters."
                : "Plain text. 20–5000 characters."}
            </small>
            <small className="field-counter">{body.length}/5000</small>
          </div>
        </label>

        <label className="community-field">
          <span>Tags</span>
          <input
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            maxLength={180}
            placeholder="education, offline, dzongkhag"
            aria-describedby="composer-tags-foot"
          />
          <div id="composer-tags-foot" className="community-field-foot">
            <small className="field-hint">Up to 6 tags, separated by commas.</small>
            <small className="field-counter">{tags.length}/180</small>
          </div>
        </label>

        <label className="community-field">
          <span>Image URL (optional)</span>
          <input
            name="imageUrl"
            type="url"
            maxLength={500}
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.org/photo.jpg"
          />
          <small>An https link to an image you have the right to use.</small>
        </label>

        {error ? (
          <p className="community-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="community-submit"
          disabled={
            pending ||
            !category ||
            title.trim().length < 6 ||
            body.trim().length < 20
          }
        >
          {pending
            ? editing
              ? "Saving…"
              : "Publishing…"
            : editing
              ? "Save changes"
              : "Publish"}
        </button>
      </form>
    </section>
  );
}
