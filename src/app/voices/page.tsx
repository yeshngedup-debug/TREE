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
