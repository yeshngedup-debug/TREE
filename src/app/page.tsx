import { SiteFooter, SiteHeader } from "@/components/brand";
import { CommunityHighlights } from "@/features/community/community-highlights";
import { HomeExperience } from "@/features/home/home-experience";
import { postQuerySchema } from "@/lib/community";
import {
  communityStats,
  featuredPosts,
  listCategories,
  listPosts,
} from "@/server/community";

export const dynamic = "force-dynamic";

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
      stats,
      ideas: ideas.posts,
      aspirations: aspirations.posts,
      featured,
      categories,
    };
  } catch {
    return {
      stats: { posts: 0, aspirations: 0, ideas: 0, members: 0 },
      ideas: [],
      aspirations: [],
      featured: [],
      categories: [],
    };
  }
}

export default async function Home() {
  const highlights = await loadHighlights();
  return (
    <>
      <SiteHeader />
      <main>
        <HomeExperience />
        <CommunityHighlights {...highlights} />
      </main>
      <SiteFooter />
    </>
  );
}
