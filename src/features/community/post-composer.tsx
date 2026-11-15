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
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload = {
      title: data.get("title"),
      body: data.get("body"),
      contentType,
      category,
      imageUrl: data.get("imageUrl") || "",
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
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <section className="community-panel" aria-labelledby="composer-title">
      <div className="community-panel-head">
        <p className="eyebrow text-foreground/45">
          {editing ? "Edit your post" : "Publish to the community"}
        </p>
        <h1 id="composer-title" className="text-3xl tracking-tight md:text-4xl">
          {editing ? "Refine what you are growing." : "What are you growing?"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-foreground/60">
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
            defaultValue={post?.title ?? ""}
            placeholder="Offline-first learning for rural schools"
          />
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
            defaultValue={post?.body ?? ""}
            placeholder="Describe the need, who it serves, and what the first step would look like."
          />
          <small>Plain text. 20–5000 characters.</small>
        </label>

        <label className="community-field">
          <span>Tags</span>
          <input
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            maxLength={180}
            placeholder="education, offline, dzongkhag"
          />
          <small>Up to 6 tags, separated by commas.</small>
        </label>

        <label className="community-field">
          <span>Image URL (optional)</span>
          <input
            name="imageUrl"
            type="url"
            maxLength={500}
            defaultValue={post?.imageUrl ?? ""}
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
          disabled={pending || !category}
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
