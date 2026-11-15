import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { ModerationConsole } from "@/features/community/moderation-console";

export const metadata: Metadata = {
  title: "Community moderation · BI Tree",
  robots: { index: false, follow: false },
};

export default function AdminCommunityPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 md:px-10">
        <ModerationConsole />
      </main>
      <SiteFooter />
    </>
  );
}
