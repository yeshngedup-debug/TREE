import { SiteFooter, SiteHeader } from "@/components/brand";
import { ExploreSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main>
        <ExploreSkeleton />
      </main>
      <SiteFooter />
    </>
  );
}
