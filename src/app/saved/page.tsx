import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bookmark, Sprout } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { SurfaceClosing, SurfaceHero, SurfaceShell } from "@/components/surface";
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
      <SurfaceShell>
        <SiteHeader />
        <main className="surface-narrow">
          <Link href="/discover" className="page-back">
            <ArrowLeft size={15} aria-hidden="true" /> Back to Discover
          </Link>
          <SurfaceHero
            kicker="Your reading list"
            title="Saved posts"
            lede="Sign in to keep a private reading list of aspirations and ideas you want to return to."
          >
            <Link
              href="/create?mode=login&next=%2Fsaved"
              className="community-submit"
            >
              Sign in
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/discover" className="surface-link">
              Browse Discover
            </Link>
          </SurfaceHero>
          <SurfaceClosing
            kicker="Find your grove"
            title="Save what you want to return to."
            text="Create a free account, or simply browse the aspirations and ideas already growing across Bhutan."
            primary={{ href: "/discover", label: "Explore Discover" }}
            secondary={{ href: "/join", label: "Add a hope" }}
          />
        </main>
        <SiteFooter />
      </SurfaceShell>
    );
  }

  const posts = await listSavedPosts(account.id);
  return (
    <SurfaceShell>
      <SiteHeader />
      <main className="surface-wide">
        <Link href="/discover" className="page-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to Discover
        </Link>
        <SurfaceHero
          kicker="Your reading list"
          title="Saved posts"
          lede="Only you can see this list. Remove a bookmark from any post page."
          compact
        />
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
        <SurfaceClosing
          kicker="Keep growing"
          title="There is always more to bring back."
          text="Discover aspirations and practical ideas from across Bhutan, or add one of your own to the Living Tree."
          primary={{ href: "/discover", label: "Explore Discover" }}
          secondary={{ href: "/create", label: "Share an idea" }}
        />
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
