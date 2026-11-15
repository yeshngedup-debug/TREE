import { Suspense } from "react";
import { SiteHeader, SiteFooter } from "@/components/brand";
import { ExploreClient } from "@/features/explore/explore-client";

export const metadata = {
  title: "Explore Bhutan · BI Tree",
  description:
    "Real Bhutanese temples, valleys, restaurants, heritage sites and folktales — curated and sourced, with an AI guide that turns your hopes into places to visit.",
};

export default function ExplorePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <Suspense fallback={<div className="h-40" />}>
          <ExploreClient />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
