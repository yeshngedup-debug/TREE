"use client";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurfaceShell } from "@/components/surface";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <SurfaceShell>
      <main className="surface-state">
        <span className="surface-state-mark">
          <Sprout size={30} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <h1>A moment to reconnect.</h1>
        <p>We could not load this part of the tree. Please try again.</p>
        <div className="surface-state-actions">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className="surface-link">
            Return home
          </Link>
        </div>
      </main>
    </SurfaceShell>
  );
}
