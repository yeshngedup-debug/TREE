import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { CommunityHighlights } from "@/features/community/community-highlights";
import {
  HomeClosing,
  HomeExperience,
} from "@/features/home/home-experience";
import { postQuerySchema } from "@/lib/community";
import "./home.css";
import {
  communityStats,
  featuredPosts,
  listCategories,
  listPosts,
} from "@/server/community";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function loadHighlights() {
  try {
    const [stats, ideas, aspirations, featured, categories] = await Promise.all([
      communityStats(),
      listPosts(postQuerySchema.parse({ type: "idea", pageSize: 3 })),
      listPosts(postQuerySchema.parse({ type: "aspiration", pageSize: 3 })),
      featuredPosts(3),
      listCategories(),
    ]);
    return {
      failed: false as const,
      stats,
      ideas: ideas.posts,
      aspirations: aspirations.posts,
      featured,
      categories,
    };
  } catch {
    return {
      failed: true as const,
      stats: { posts: 0, aspirations: 0, ideas: 0, members: 0 },
      ideas: [],
      aspirations: [],
      featured: [],
      categories: [],
    };
  }
}

export default async function Home() {
  const { failed, ...highlights } = await loadHighlights();
  return (
    <>
      <SiteHeader />
      <main className="home-shell">
        <HomeExperience />
        {failed && (
          <p className="community-error home-data-error" role="alert">
            The community grove is not loading right now. Check your connection
            and try again in a moment.
          </p>
        )}
        <CommunityHighlights {...highlights} />
        <HomeClosing />
      </main>
      <SiteFooter />
    </>
  );
}
