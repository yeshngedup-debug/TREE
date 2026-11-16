import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Leaf, Search, Sprout } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { PostCard } from "@/features/community/post-card";
import { DiscoverReveal } from "@/features/discover/discover-reveal";
import {
  communityContentTypeLabels,
  communityContentTypes,
  formatPostDate,
  parseCommunityQuery,
} from "@/lib/community";
import { listCategories, listPosts, popularTags } from "@/server/community";
import "./discover.css";

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

  const firstImage = result.posts[0]?.imageUrl ?? "";
  const filtered = Boolean(query.q || query.type || query.category || query.tag);

  return (
    <div className="discover-shell">
      <SiteHeader />
      <main className="discover-main">
        <DiscoverReveal>
          {/* 1. Hero — split editorial intro with the live grove ledger ------- */}
          <section className="discover-hero">
            <div className="discover-hero-grid">
              <div className="discover-copy">
                <p className="discover-kicker">The community grove</p>
                <h1 className="discover-title">
                  <span className="discover-line">
                    <span>Every leaf has</span>
                  </span>
                  <span className="discover-line">
                    <span>
                      a{" "}
                      {firstImage ? (
                        <span
                          className="discover-inline-photo"
                          style={{ backgroundImage: `url(${firstImage})` }}
                          aria-hidden="true"
                        />
                      ) : null}
                      story to tell.
                    </span>
                  </span>
                </h1>
                <p className="discover-lede">
                  Bhutan&rsquo;s published aspirations, each with an author and a
                  leaf on the Living Tree. Search, or follow a tag.
                </p>
                <div className="discover-actions">
                  <Link href="#grove-filters" className="discover-cta discover-cta-primary">
                    Search the grove
                    <ArrowDown size={16} aria-hidden="true" />
                  </Link>
                  <Link href="/create" className="discover-cta discover-cta-secondary">
                    Share an idea
                  </Link>
                </div>
              </div>

              <div className="grove-card">
                <p className="grove-ledger-label">
                  <Leaf size={14} aria-hidden="true" />
                  The grove ledger
                </p>
                <dl className="grove-stats">
                  <div>
                    <dt>Published posts</dt>
                    <dd>{result.total}</dd>
                  </div>
                  <div>
                    <dt>Themes</dt>
                    <dd>{categories.length}</dd>
                  </div>
                  <div>
                    <dt>Tags</dt>
                    <dd>{tags.length}</dd>
                  </div>
                </dl>
                <div className="grove-latest">
                  <p className="grove-latest-label">Latest in the grove</p>
                  {result.posts.length ? (
                    <ul>
                      {result.posts.slice(0, 4).map((post) => (
                        <li key={post.id}>
                          <Link href={`/posts/${post.slug}`}>
                            <span className="grove-latest-title">
                              {post.title}
                            </span>
                            <span className="grove-latest-meta">
                              {post.author.displayName} ·{" "}
                              {formatPostDate(post.createdAt)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="grove-fallback">
                      The grove is quiet right now. Publish the first leaf and it
                      will land here.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Tag marquee — real community tags, two loop groups ---------- */}
          {tags.length ? (
            <div className="discover-tags" aria-label="Popular tags">
              <div className="discover-tags-track">
                <div className="discover-tags-group">
                  {tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={hrefFor({ tag: tag.slug, page: undefined })}
                      className="discover-tags-item"
                    >
                      <span className="hash">#</span>
                      {tag.slug} <Leaf size={12} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
                <div className="discover-tags-group" aria-hidden="true">
                  {tags.map((tag) => (
                    <span key={tag.slug} className="discover-tags-item">
                      <span className="hash">#</span>
                      {tag.slug} <Leaf size={12} aria-hidden="true" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* 3. Filters ----------------------------------------------------- */}
          <div className="discover-filters-wrap">
            <form
              action="/discover"
              method="get"
              className="discover-filters"
              id="grove-filters"
              data-reveal
            >
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
                <select name="type" defaultValue={query.type ?? ""} className="discover-select">
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
                <select name="category" defaultValue={query.category ?? ""} className="discover-select">
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
                <select name="sort" defaultValue={query.sort} className="discover-select">
                  <option value="newest">Newest first</option>
                  <option value="popular">Most popular</option>
                </select>
              </label>
              <button type="submit" className="discover-apply">
                Apply
              </button>
            </form>
          </div>

          {/* 4. Active filter chips ------------------------------------------ */}
          {(query.tag || activeCategory || query.q || query.type) && (
            <div className="discover-active" aria-label="Active filters">
              <span>Filtered by</span>
              {query.q ? (
                <Link href={hrefFor({ q: undefined, page: undefined })}>
                  &ldquo;{query.q}&rdquo; ×
                </Link>
              ) : null}
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

          {/* 5. Results + aside ---------------------------------------------- */}
          <div className="discover-layout" data-reveal>
            <section aria-label="Posts">
              <div className="discover-results-head">
                <h2 className="discover-results-title">Leaves from the grove</h2>
                <p className="discover-results-count">
                  {result.total}{" "}
                  {result.total === 1 ? "leaf" : "leaves"}
                  {filtered ? " in this view" : " and counting"}
                </p>
              </div>

              {result.posts.length ? (
                <div className="discover-grid">
                  {result.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="community-empty">
                  <Sprout size={22} aria-hidden="true" />
                  <h2>Nothing has grown here yet.</h2>
                  <p>
                    Try a broader search, another category, or clear the filters
                    to see the whole grove.
                  </p>
                  <div className="discover-empty-actions">
                    <Link href="/discover" className="discover-cta discover-cta-primary">
                      Clear the search
                    </Link>
                  </div>
                </div>
              )}

              {result.pages > 1 ? (
                <nav className="discover-pagination" aria-label="Pagination">
                  <Link
                    href={hrefFor({ page: Math.max(1, query.page - 1) })}
                    aria-disabled={query.page === 1}
                    tabIndex={query.page === 1 ? -1 : undefined}
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
                    tabIndex={query.page >= result.pages ? -1 : undefined}
                    className={
                      query.page >= result.pages ? "is-disabled" : undefined
                    }
                  >
                    Next
                  </Link>
                </nav>
              ) : null}
            </section>

            <aside className="discover-aside">
              <h2>Themes to walk</h2>
              <p>Each path counts its own leaves.</p>
              <ul className="discover-category-list">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={hrefFor({ category: category.slug, page: undefined })}
                      aria-current={
                        query.category === category.slug ? "true" : undefined
                      }
                    >
                      {category.label}
                      <span>{category.postCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {/* 6. Sourcing note -------------------------------------------------- */}
          <p className="discover-sourcing">
            Every post above is a real, published community entry with an author,
            a date and a theme. Counts and tags are computed live from the
            database and nothing here is generated. If something looks wrong,
            report it from the post itself.
          </p>

          {/* 7. Closing call --------------------------------------------------- */}
          <section className="discover-closing" data-reveal>
            <div className="discover-closing-card">
              <Sprout
                className="discover-closing-sprout"
                size={460}
                strokeWidth={0.5}
                aria-hidden="true"
              />
              <h2 className="discover-closing-title">The grove keeps growing.</h2>
              <p className="closing-copy">
                Your next leaf is one idea away. Walk the four curated paths, or
                plant something the community can grow with you.
              </p>
              <div className="closing-actions">
                <Link href="/explore" className="closing-primary">
                  Walk the four paths
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/join" className="closing-secondary">
                  Grow your own leaf
                </Link>
              </div>
            </div>
          </section>
        </DiscoverReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
