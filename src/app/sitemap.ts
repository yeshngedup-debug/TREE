import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/server/community";

export const dynamic = "force-dynamic";

function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(configured || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

const staticRoutes: Array<{
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/discover", priority: 0.9, changeFrequency: "daily" },
  { path: "/explore", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tree", priority: 0.7, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();
  let posts: Awaited<ReturnType<typeof sitemapEntries>>["posts"] = [];
  let profiles: Awaited<ReturnType<typeof sitemapEntries>>["profiles"] = [];
  try {
    const entries = await sitemapEntries();
    posts = entries.posts;
    profiles = entries.profiles;
  } catch {
    // The sitemap still lists public static routes when the database is down.
  }

  return [
    ...staticRoutes.map((route) => ({
      url: new URL(route.path, base).toString(),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...posts.map((post) => ({
      url: new URL(`/posts/${post.slug}`, base).toString(),
      lastModified: new Date(post.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...profiles.map((profile) => ({
      url: new URL(`/u/${profile.username}`, base).toString(),
      lastModified: new Date(profile.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
