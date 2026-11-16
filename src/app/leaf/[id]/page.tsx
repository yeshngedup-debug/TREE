import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLeaf } from "@/server/db";
import { SiteHeader, SiteFooter } from "@/components/brand";
import { SurfaceShell } from "@/components/surface";
import { LeafResult } from "@/features/leaf/leaf-result";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function LeafPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    leaf = await getLeaf(id);
  if (!leaf) notFound();
  return (
    <SurfaceShell>
      <SiteHeader />
      <main className="surface-narrow">
        <Link href="/" className="page-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to home
        </Link>
        <LeafResult leaf={leaf} keepsake />
      </main>
      <SiteFooter />
    </SurfaceShell>
  );
}
