import { SiteFooter, SiteHeader } from "@/components/brand";
import { DiscoverSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main>
        <DiscoverSkeleton />
      </main>
      <SiteFooter />
    </>
  );
}
