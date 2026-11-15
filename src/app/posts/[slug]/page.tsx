import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { CommentSection } from "@/features/community/comment-section";
import { PostEngagement } from "@/features/community/post-engagement";
import { PostOwnerActions } from "@/features/community/post-owner-actions";
import { CommunityAvatar, PostCard } from "@/features/community/post-card";
import { ShareButton } from "@/features/community/share-button";
import {
  communityContentTypeLabels,
  formatPostDate,
} from "@/lib/community";
import {
  engagementFor,
  getPost,
  listComments,
  relatedPosts,
} from "@/server/community";
import { currentAccount } from "@/server/community-session";

export const dynamic = "force-dynamic";

const loadPost = cache(async (slug: string) => getPost(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "Post not found · BI Tree" };
  const title = `${post.title} · BI Tree`;
  return {
    title,
    description: post.excerpt,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      title,
      description: post.excerpt,
      type: "article",
      url: `/posts/${post.slug}`,
      publishedTime: post.createdAt,
      authors: [post.author.displayName],
      images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
    },
    twitter: {
      card: post.imageUrl ? "summary_large_image" : "summary",
      title,
      description: post.excerpt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();
  const account = await currentAccount();
  const [related, engagement, comments] = await Promise.all([
    relatedPosts(post),
    engagementFor(account?.id ?? null, post.id),
    listComments(post.id),
  ]);
  const ownPost = Boolean(account && account.username === post.author.username);
  const label = communityContentTypeLabels[post.contentType];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author.displayName,
      url: `/u/${post.author.username}`,
    },
    image: post.imageUrl || undefined,
    articleSection: post.category.label,
    keywords: post.tags.join(", "),
    inLanguage: "en",
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[900px] px-5 pb-20 pt-6 md:px-10">
        <Link href="/discover" className="post-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to discover
        </Link>

        <article className="post-article">
          <div className="community-card-meta">
            <span className={`community-type community-type-${post.contentType}`}>
              {label}
            </span>
            <Link href={`/discover?category=${post.category.slug}`}>
              {post.category.label}
            </Link>
          </div>
          <h1 className="post-title">{post.title}</h1>
          <div className="post-byline">
            <Link href={`/u/${post.author.username}`} className="community-byline">
              <CommunityAvatar author={post.author} size={40} />
              <span>
                <strong>{post.author.displayName}</strong>
                <small>@{post.author.username}</small>
              </span>
            </Link>
            <span className="post-date">
              <CalendarDays size={14} aria-hidden="true" />
              <time dateTime={post.createdAt}>
                {formatPostDate(post.createdAt)}
              </time>
            </span>
            <ShareButton title={post.title} path={`/posts/${post.slug}`} />
          </div>

          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt=""
              className="post-hero-image"
              referrerPolicy="no-referrer"
            />
          ) : null}

          <div className="post-body">
            {post.body.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {post.tags.length ? (
            <div className="community-tags post-tags">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/discover?tag=${tag}`}
                  className="community-tag"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          {ownPost ? (
            <PostOwnerActions slug={post.slug} username={post.author.username} />
          ) : null}
        </article>

        <PostEngagement
          slug={post.slug}
          initial={engagement}
          signedIn={Boolean(account)}
        />

        <CommentSection
          slug={post.slug}
          initialComments={comments}
          signedIn={Boolean(account)}
          currentUsername={account?.username ?? ""}
        />

        {related.length ? (
          <section className="post-related" aria-labelledby="related-title">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-foreground/45">
                  More from {post.category.label}
                </p>
                <h2 id="related-title" className="mt-2 text-2xl">
                  Related posts
                </h2>
              </div>
              <Link
                href={`/discover?category=${post.category.slug}`}
                className="flex min-h-11 items-center gap-2 text-xs"
              >
                See all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        ) : null}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
