import Link from "next/link";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurfaceShell } from "@/components/surface";

export default function NotFound() {
  return (
    <SurfaceShell>
      <main className="surface-state">
        <span className="surface-state-mark">
          <Sprout size={30} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <h1>This leaf has drifted away.</h1>
        <p>
          The page may have moved, or this leaf is no longer on the public tree.
        </p>
        <div className="surface-state-actions">
          <Button asChild>
            <Link href="/">Return to the living tree</Link>
          </Button>
          <Link href="/discover" className="surface-link">
            Browse Discover
          </Link>
        </div>
      </main>
    </SurfaceShell>
  );
}
