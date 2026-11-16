import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Lightbulb,
  Sprout,
  Users,
} from "lucide-react";
import type {
  CommunityCategory,
  CommunityPostSummary,
} from "@/lib/community";
import { PostCard } from "@/features/community/post-card";

type Stats = {
  posts: number;
  aspirations: number;
  ideas: number;
  members: number;
};

export function CommunityHighlights({
  stats,
  ideas,
  aspirations,
  featured,
  categories,
}: {
  stats: Stats;
  ideas: CommunityPostSummary[];
  aspirations: CommunityPostSummary[];
  featured: CommunityPostSummary[];
  categories: (CommunityCategory & { postCount: number })[];
}) {
  const empty = !stats.posts;
  return (
    <>
      <section className="mx-auto max-w-[1440px] px-5 pt-6 md:px-10">
        <div className="community-intro rounded-[28px] bg-primary p-7 text-primary-foreground md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow opacity-60">The community grove</p>
              <h2 className="mt-3 max-w-2xl text-3xl leading-tight tracking-tight md:text-4xl">
                Aspirations grow into ideas. Ideas grow into action.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 opacity-70">
                Read what Bhutan is imagining, add a practical idea, and follow
                the threads that matter to you.
              </p>
            </div>
            <Link
              href="/create"
              className="community-intro-cta inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-primary"
            >
              Share an idea <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <dl className="community-stats">
            {[
              { label: "Published posts", value: stats.posts, Icon: FileText },
              { label: "Aspirations", value: stats.aspirations, Icon: Sprout },
              { label: "Ideas", value: stats.ideas, Icon: Lightbulb },
              { label: "Members", value: stats.members, Icon: Users },
            ].map(({ label, value, Icon }) => (
              <div key={label}>
                <dt>
                  <Icon size={14} aria-hidden="true" /> {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-14">
        {empty ? (
          <div className="community-empty">
            <Sprout size={22} aria-hidden="true" />
            <h3>The first idea is waiting to be planted.</h3>
            <p>
              The community grove opens with its first aspiration or idea. Add
              one and it will appear here and on the Living Tree.
            </p>
            <Link href="/create">Publish the first post</Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {featured.length ? (
              <div className="lg:col-span-2">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow text-soft">
                      Curated by moderators
                    </p>
                    <h2 className="mt-2 text-2xl md:text-3xl">
                      Featured in the grove
                    </h2>
                  </div>
                  <Link
                    href="/discover?sort=popular"
                    className="flex min-h-11 items-center gap-2 text-xs"
                  >
                    Popular posts <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {featured.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-soft">Practical paths</p>
                  <h2 className="mt-2 text-2xl md:text-3xl">Latest ideas</h2>
                </div>
                <Link
                  href="/discover?type=idea"
                  className="flex min-h-11 items-center gap-2 text-xs"
                >
                  All ideas <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="grid gap-4">
                {ideas.length ? (
                  ideas.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <p className="community-hint">No ideas published yet.</p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-soft">Futures imagined</p>
                  <h2 className="mt-2 text-2xl md:text-3xl">
                    Recent aspirations
                  </h2>
                </div>
                <Link
                  href="/discover?type=aspiration"
                  className="flex min-h-11 items-center gap-2 text-xs"
                >
                  All aspirations <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="grid gap-4">
                {aspirations.length ? (
                  aspirations.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <p className="community-hint">
                    No aspirations published yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto mb-12 max-w-[1440px] px-5 md:px-10">
        <div className="rounded-[28px] bg-card p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-soft">Browse by theme</p>
              <h2 className="mt-2 text-2xl">Popular categories</h2>
            </div>
            <Link href="/discover" className="flex min-h-11 items-center gap-2 text-xs">
              Discover everything <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/discover?category=${category.slug}`}
                className="community-chip"
              >
                {category.label}
                <span aria-hidden="true">{category.postCount}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
