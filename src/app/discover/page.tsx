import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sprout } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { PostCard } from "@/features/community/post-card";
import {
  communityContentTypeLabels,
  communityContentTypes,
  parseCommunityQuery,
} from "@/lib/community";
import { listCategories, listPosts, popularTags } from "@/server/community";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover aspirations and ideas · BI Tree",
  description:
    "Search and browse the aspirations and practical ideas growing across Bhutan, by category, content type and tag.",
  alternates: { canonical: "/discover" },
  openGraph: {
    title: "Discover aspirations and ideas · BI Tree",
    description:
      "Search and browse the aspirations and practical ideas growing across Bhutan, by category, content type and tag.",
    url: "/discover",
  },
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = parseCommunityQuery(raw);
  const [result, categories, tags] = await Promise.all([
    listPosts(query),
    listCategories(),
    popularTags(),
  ]);

  const hrefFor = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const values: Record<string, string | number | undefined> = {
      q: query.q || undefined,
      type: query.type,
      category: query.category,
      tag: query.tag,
      sort: query.sort === "newest" ? undefined : query.sort,
      ...updates,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const search = params.toString();
    return search ? `/discover?${search}` : "/discover";
  };

  const activeCategory = categories.find(
    (category) => category.slug === query.category,
  );
  const firstPage = Math.max(1, Math.min(query.page - 2, result.pages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, result.pages) },
    (_, index) => firstPage + index,
  ).filter((page) => page <= result.pages);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-6 md:px-10">
        <header className="discover-head">
          <p className="eyebrow text-foreground/45">The community grove</p>
          <h1 className="mt-3 text-4xl tracking-tight md:text-5xl">
            Discover what Bhutan is imagining.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/60 md:text-base">
            Every published aspiration and idea lives here, with an author and a
            place on the Living Tree. Search by keyword, follow a theme, or start
            with a tag.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/create" className="community-intro-cta inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
              Share an idea
            </Link>
            <span className="text-xs text-foreground/50">
              {result.total} published {result.total === 1 ? "post" : "posts"}
            </span>
          </div>
        </header>

        <form action="/discover" method="get" className="discover-filters">
          <label className="discover-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search posts</span>
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              maxLength={80}
              placeholder="Search aspirations and ideas"
            />
          </label>
          <label>
            <span className="sr-only">Content type</span>
            <select name="type" defaultValue={query.type ?? ""}>
              <option value="">All types</option>
              {communityContentTypes.map((type) => (
                <option key={type} value={type}>
                  {communityContentTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Category</span>
            <select name="category" defaultValue={query.category ?? ""}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort order</span>
            <select name="sort" defaultValue={query.sort}>
              <option value="newest">Newest first</option>
              <option value="popular">Most popular</option>
            </select>
          </label>
          <button type="submit" className="discover-apply">
            Apply
          </button>
        </form>

        {(query.tag || activeCategory || query.q || query.type) && (
          <div className="discover-active" aria-label="Active filters">
            <span>Filtered by</span>
            {query.q ? <Link href={hrefFor({ q: undefined, page: undefined })}>“{query.q}” ×</Link> : null}
            {query.type ? (
              <Link href={hrefFor({ type: undefined, page: undefined })}>
                {communityContentTypeLabels[query.type]} ×
              </Link>
            ) : null}
            {activeCategory ? (
              <Link href={hrefFor({ category: undefined, page: undefined })}>
                {activeCategory.label} ×
              </Link>
            ) : null}
            {query.tag ? (
              <Link href={hrefFor({ tag: undefined, page: undefined })}>
                #{query.tag} ×
              </Link>
            ) : null}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_240px]">
          <section aria-label="Posts">
            {result.posts.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {result.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="community-empty">
                <Sprout size={22} aria-hidden="true" />
                <h2>Nothing has grown here yet.</h2>
                <p>
                  Try a broader search, another category, or publish the first
                  post on this theme.
                </p>
                <Link href="/create">Share an idea</Link>
              </div>
            )}

            {result.pages > 1 ? (
              <nav className="discover-pagination" aria-label="Pagination">
                <Link
                  href={hrefFor({ page: Math.max(1, query.page - 1) })}
                  aria-disabled={query.page === 1}
                  className={query.page === 1 ? "is-disabled" : undefined}
                >
                  Previous
                </Link>
                {pageNumbers.map((page) => (
                  <Link
                    key={page}
                    href={hrefFor({ page })}
                    aria-current={page === query.page ? "page" : undefined}
                  >
                    {page}
                  </Link>
                ))}
                <Link
                  href={hrefFor({ page: Math.min(result.pages, query.page + 1) })}
                  aria-disabled={query.page >= result.pages}
                  className={query.page >= result.pages ? "is-disabled" : undefined}
                >
                  Next
                </Link>
              </nav>
            ) : null}
          </section>

          <aside className="discover-aside">
            <h2>Popular tags</h2>
            {tags.length ? (
              <div className="community-tags">
                {tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={hrefFor({ tag: tag.slug, page: undefined })}
                    className="community-tag"
                  >
                    #{tag.slug}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="community-hint">
                Tags appear as the community publishes.
              </p>
            )}
            <h2>Categories</h2>
            <ul className="discover-category-list">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={hrefFor({ category: category.slug, page: undefined })}
                  >
                    {category.label}
                    <span>{category.postCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
