import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import {
  communityContentTypeLabels,
  formatPostDate,
  type CommunityAuthor,
  type CommunityPostSummary,
} from "@/lib/community";

export function CommunityAvatar({
  author,
  size = 36,
}: {
  author: Pick<CommunityAuthor, "displayName" | "avatarUrl">;
  size?: number;
}) {
  if (author.avatarUrl)
    return (
      <img
        src={author.avatarUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="community-avatar"
        style={{ width: size, height: size }}
      />
    );
  return (
    <span
      className="community-avatar community-avatar-fallback"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {(author.displayName || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PostCard({ post }: { post: CommunityPostSummary }) {
  const label = communityContentTypeLabels[post.contentType];
  return (
    <article className="community-card">
      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="community-card-media"
        />
      ) : null}
      <div className="community-card-body">
        <div className="community-card-meta">
          {post.featured ? (
            <span className="community-featured">Featured</span>
          ) : null}
          <span className={`community-type community-type-${post.contentType}`}>
            {label}
          </span>
          <Link href={`/discover?category=${post.category.slug}`}>
            {post.category.label}
          </Link>
          <time dateTime={post.createdAt}>
            {formatPostDate(post.createdAt)}
          </time>
        </div>
        <h3 className="community-card-title">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="community-card-excerpt">{post.excerpt}</p>
        {post.tags.length ? (
          <div className="community-tags">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/discover?tag=${tag}`} className="community-tag">
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="community-card-foot">
          <Link href={`/u/${post.author.username}`} className="community-byline">
            <CommunityAvatar author={post.author} size={28} />
            <span>{post.author.displayName}</span>
          </Link>
          <span
            className="community-card-stats"
            aria-label={`${post.likeCount} likes and ${post.commentCount} comments`}
          >
            <Heart size={13} aria-hidden="true" />
            {post.likeCount}
            <MessageCircle size={13} aria-hidden="true" />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}
