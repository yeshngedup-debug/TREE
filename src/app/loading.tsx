import { SiteFooter, SiteHeader } from "@/components/brand";
import { HomeSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main>
        <HomeSkeleton />
      </main>
      <SiteFooter />
    </>
  );
}
