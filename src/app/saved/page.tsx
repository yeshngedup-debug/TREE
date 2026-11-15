import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Sprout } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { PostCard } from "@/features/community/post-card";
import { listSavedPosts } from "@/server/community";
import { currentAccount } from "@/server/community-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved posts · BI Tree",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const account = await currentAccount();
  if (!account) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-[900px] px-5 pb-20 pt-10 md:px-10">
          <section className="community-panel">
            <p className="eyebrow text-foreground/45">Your reading list</p>
            <h1 className="mt-3 text-3xl tracking-tight">Saved posts</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-foreground/60">
              Sign in to keep a private reading list of aspirations and ideas you
              want to return to.
            </p>
            <Link
              href="/create?mode=login&next=%2Fsaved"
              className="community-submit mt-6 inline-flex items-center justify-center"
            >
              Sign in
            </Link>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const posts = await listSavedPosts(account.id);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 md:px-10">
        <header className="discover-head">
          <p className="eyebrow text-foreground/45">Your reading list</p>
          <h1 className="mt-3 text-4xl tracking-tight md:text-5xl">
            Saved posts
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/60">
            Only you can see this list. Remove a bookmark from any post page.
          </p>
        </header>
        {posts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="community-empty">
            <Bookmark size={22} aria-hidden="true" />
            <h2>Nothing saved yet.</h2>
            <p>
              Use the Save button on any post to keep it here for later. Saved
              posts stay private to your account.
            </p>
            <Link href="/discover">
              <Sprout size={14} aria-hidden="true" /> Browse Discover
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
