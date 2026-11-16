import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { SurfaceShell } from "@/components/surface";
import { ModerationConsole } from "@/features/community/moderation-console";

export const metadata: Metadata = {
  title: "Community moderation · BI Tree",
  robots: { index: false, follow: false },
};

export default function AdminCommunityPage() {
  return (
    <SurfaceShell>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-4 md:px-10">
        <ModerationConsole />
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
