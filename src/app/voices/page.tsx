import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/brand";
import { SurfaceClosing, SurfaceShell } from "@/components/surface";
import { VisitorVoices } from "@/features/join/visitor-voices";

export const metadata = {
  title: "Your previous voices",
  robots: { index: false, follow: false },
};

export default function VoicesPage() {
  return (
    <SurfaceShell>
      <SiteHeader />
      <main className="surface-narrow surface-voices">
        <Link href="/join" className="page-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to Add your hope
        </Link>
        <VisitorVoices />
        <SurfaceClosing
          kicker="The tree is still growing"
          title="Leave another hope when you are ready."
          text="Your previous voices will wait here. Add a new leaf to the Living Tree, or explore what others have shared."
          primary={{ href: "/join", label: "Add your hope" }}
          secondary={{ href: "/discover", label: "Explore Discover" }}
        />
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
