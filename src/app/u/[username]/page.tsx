import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import {
  CommunityAvatar,
  PostCard,
} from "@/features/community/post-card";
import { ProfileEditor, SignOutButton } from "@/features/community/profile-editor";
import { formatPostDate } from "@/lib/community";
import {
  accountByUsername,
  postCounts,
  postsByAuthor,
} from "@/server/community";
import { currentAccount } from "@/server/community-session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const account = await accountByUsername(username);
  if (!account) return { title: "Profile not found · BI Tree" };
  return {
    title: `${account.displayName} (@${account.username}) · BI Tree`,
    description:
      account.bio ||
      `${account.displayName} shares aspirations and ideas for Bhutan on BI Tree.`,
    alternates: { canonical: `/u/${account.username}` },
    openGraph: {
      title: `${account.displayName} (@${account.username})`,
      description:
        account.bio ||
        `${account.displayName} shares aspirations and ideas for Bhutan on BI Tree.`,
      url: `/u/${account.username}`,
      images: account.avatarUrl ? [{ url: account.avatarUrl }] : undefined,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const account = await accountByUsername(username);
  if (!account) notFound();

  const [posts, counts, viewer] = await Promise.all([
    postsByAuthor(account.username),
    postCounts(account.id),
    currentAccount(),
  ]);
  const isOwner = viewer?.id === account.id;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: account.displayName,
    alternateName: account.username,
    description: account.bio || undefined,
    image: account.avatarUrl || undefined,
    url: `/u/${account.username}`,
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-6 md:px-10">
        <header className="profile-head">
          <CommunityAvatar author={account} size={88} />
          <div className="min-w-0">
            <p className="eyebrow text-foreground/45">Community member</p>
            <h1 className="mt-2 text-3xl tracking-tight md:text-4xl">
              {account.displayName}
            </h1>
            <p className="mt-1 text-sm text-foreground/50">@{account.username}</p>
            {account.bio ? (
              <p className="mt-4 max-w-xl text-sm leading-6 text-foreground/65">
                {account.bio}
              </p>
            ) : null}
            <div className="profile-meta">
              <span>
                <CalendarDays size={14} aria-hidden="true" /> Joined{" "}
                {formatPostDate(account.createdAt)}
              </span>
              <span>{counts.total} published</span>
              <span>{counts.aspirations} aspirations</span>
              <span>{counts.ideas} ideas</span>
            </div>
          </div>
        </header>

        {isOwner ? (
          <div className="profile-owner-row">
            <ProfileEditor account={account} />
            <SignOutButton />
          </div>
        ) : null}

        <section className="mt-10" aria-labelledby="profile-posts">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-foreground/45">Published work</p>
              <h2 id="profile-posts" className="mt-2 text-2xl md:text-3xl">
                {isOwner ? "Your aspirations and ideas" : "Aspirations and ideas"}
              </h2>
            </div>
            {isOwner ? (
              <a
                href="/create"
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground"
              >
                Share something new
              </a>
            ) : null}
          </div>

          {posts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="community-empty">
              <h3>Nothing published yet.</h3>
              <p>
                {isOwner
                  ? "Your first aspiration or idea will appear here and on the Living Tree."
                  : "When this member publishes an aspiration or idea, it will appear here."}
              </p>
              {isOwner ? <a href="/create">Share an idea</a> : null}
            </div>
          )}
        </section>

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
