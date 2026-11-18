import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLeaf } from "@/server/db";
import { themeFor } from "@/lib/catalog";
import { SiteHeader, SiteFooter } from "@/components/brand";
import { SurfaceShell } from "@/components/surface";
import { LeafResult } from "@/features/leaf/leaf-result";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clipped(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const leaf = await getLeaf(id);
  if (!leaf) return { title: "This hope hasn't taken root · BI Tree" };
  const message = clipped(leaf.leaf_message, 88),
    theme = themeFor(leaf.category),
    quote = `“${message}”`,
    description = `An anonymous ${theme.short.toLowerCase()} hope, grown into the Living Tree. Leave your own.`;
  return {
    title: `${quote} · BI Tree`,
    description,
    alternates: { canonical: `/leaf/${leaf.id}` },
    openGraph: {
      title: quote,
      description,
      type: "website",
      url: `/leaf/${leaf.id}`,
    },
    twitter: { card: "summary_large_image", title: quote, description },
  };
}
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
