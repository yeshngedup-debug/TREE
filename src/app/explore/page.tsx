import { Suspense } from "react";
import { SiteHeader, SiteFooter } from "@/components/brand";
import { ExploreClient } from "@/features/explore/explore-client";
import "./explore.css";

export const metadata = {
  title: "Explore Bhutan · BI Tree",
  description:
    "Real Bhutanese temples, valleys, restaurants, heritage sites and folktales — curated and sourced, with an AI guide that turns your hopes into places to visit.",
};

export default function ExplorePage() {
  return (
    <div className="explore-shell">
      <SiteHeader />
      <main className="explore-main">
        <Suspense fallback={<div className="h-40" />}>
          <ExploreClient />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
