import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { guidePaths, pathDetails, type GuidePathId } from "@/lib/catalog";
export function GuideRecommendation({
  path,
  reason,
}: {
  path: GuidePathId;
  reason?: string;
}) {
  const detail = pathDetails[path];
  return (
    <section className="guide-card" aria-label="Suggested place to explore">
      <div className="flex items-start gap-3">
        <span className="guide-badge">
          <Compass size={20} strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-foreground/65">
            Your next step · Guide path {path} of 4
          </p>
          <h2 className="text-2xl leading-tight">{guidePaths[path]}</h2>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/70">
        {reason || detail.reason}
      </p>
      <Link
        href={`/explore?path=${path}`}
        className="mt-2 inline-flex min-h-9 items-center gap-2 text-xs font-medium"
      >
        Explore this in Bhutan
        <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}
