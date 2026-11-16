import type { CSSProperties } from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

export function HomeSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1440px] px-5 pt-16 md:px-10 md:pt-24"
      aria-busy="true"
      aria-label="Loading the BI Tree home page"
    >
      <Skeleton className="h-3 w-28 rounded-full" />
      <Skeleton className="mt-6 h-14 w-[min(640px,92%)] md:h-24" />
      <Skeleton className="mt-3 h-14 w-[min(480px,78%)] md:h-24" />
      <div className="mt-8 flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36 rounded-full" />
        <Skeleton className="h-11 w-44 rounded-full" />
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-[24px]" />
        ))}
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

export function DiscoverSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1440px] px-5 pt-12 md:px-10 md:pt-16"
      aria-busy="true"
      aria-label="Loading Discover"
    >
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-5 h-12 w-[min(560px,90%)] md:h-20" />
      <Skeleton className="mt-8 h-14 w-full rounded-full md:h-16" />
      <div className="mt-4 flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-72 rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

export function ExploreSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1440px] px-5 pt-16 md:px-10 md:pt-24"
      aria-busy="true"
      aria-label="Loading Explore Bhutan"
    >
      <Skeleton className="h-3 w-32 rounded-full" />
      <Skeleton className="mt-6 h-14 w-[min(660px,92%)] md:h-24" />
      <Skeleton className="mt-3 h-14 w-[min(460px,76%)] md:h-24" />
      <div className="mt-10 grid gap-5 lg:grid-cols-[7fr_5fr]">
        <Skeleton className="aspect-[16/10] w-full rounded-[28px] lg:aspect-auto lg:min-h-[420px]" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-[24px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
