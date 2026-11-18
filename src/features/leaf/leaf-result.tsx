"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Share2,
  Sprout,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { themeFor, guidePaths, type Leaf } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/client";
import { GuideRecommendation } from "@/features/guide/guide-card";
import { VisitorAccess } from "@/features/join/visitor-access";
import { ReceiptTree } from "./receipt-tree";
import { bhutanFacts } from "@/lib/bhutan-facts";
export function LeafResult({
  leaf,
  keepsake = false,
  compact = false,
  reply = "",
  replyMode = "offline",
  original = "",
}: {
  leaf: Leaf;
  keepsake?: boolean;
  compact?: boolean;
  reply?: string;
  replyMode?: "offline" | "openai";
  original?: string;
}) {
  const [notice, setNotice] = useState("");
  const theme = themeFor(leaf.category);
  async function share() {
    const url = appUrl() + "/leaf/" + leaf.id;
    if (navigator.share)
      try {
        await navigator.share({
          title: "My hope for Bhutan",
          text: leaf.leaf_message,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Your keepsake link is copied.");
    } catch {
      setNotice(url);
    }
  }
  function download() {
    const escape = (text: string) =>
      text.replace(
        /[<>&'"]/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            "'": "&apos;",
            '"': "&quot;",
          })[char]!,
      );
    const words = leaf.leaf_message.split(" "),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      if ((line + " " + word).length > 32) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#252720"/><rect x="30" y="30" width="740" height="940" rx="25" fill="#34372d"/><text x="400" y="120" fill="#d8ed92" font-family="Arial" font-size="16" letter-spacing="4" text-anchor="middle">BI Tree</text><path d="M400 350C290 270 290 175 400 160C500 215 500 295 400 350Z" fill="${theme.color}"/><path d="M400 325V205" stroke="#f8f1d8" opacity=".4"/>${lines.map((text, index) => `<text x="400" y="${470 + index * 48}" fill="#f8f1df" font-family="Arial" font-size="30" text-anchor="middle">${escape(text)}</text>`).join("")}<text x="400" y="760" fill="#d8ed92" font-family="Arial" font-size="18" text-anchor="middle">${escape(theme.label)}</text><text x="400" y="825" fill="#f8f1df" font-family="Arial" font-size="22" text-anchor="middle">${escape(guidePaths[leaf.chamber_id])}</text><text x="400" y="920" fill="#b9bdae" font-family="Arial" font-size="13" text-anchor="middle">${leaf.is_demo ? "Illustrative demo leaf · " : ""}Rooted in values. Growing through people.</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bi-tree-leaf-${leaf.id.slice(0, 8)}.svg`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Your keepsake has been downloaded.");
  }
  if (compact)
    return (
      <div className="join-receipt space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
            <Check size={20} />
          </span>
          <div>
            <h2 className="text-2xl">Your leaf is growing.</h2>
            <p className="mt-1 text-xs text-soft">
              Look for leaf #{leaf.id.slice(0, 6)} on the big screen.
            </p>
          </div>
        </div>
        {reply && (
          <section className="private-reply" aria-label="A reply to your note">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-medium">
                <MessageCircle size={15} />A little reflection for you
              </span>
              <span className="text-xs text-soft">
                {replyMode === "openai" ? "AI reply" : "Offline reply"}
              </span>
            </div>
            <p className="text-sm leading-6" data-testid="visitor-reply">
              {reply}
            </p>
            <aside className="bi-tree-fact">
              <p className="text-xs font-medium">A little about Bhutan</p>
              <p className="mt-1 text-xs leading-5 text-soft">
                {bhutanFacts[leaf.category].text}
              </p>
              <a
                href={bhutanFacts[leaf.category].source}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-8 items-center text-xs underline underline-offset-4"
              >
                From documented sources <ArrowUpRight size={11} />
              </a>
            </aside>
            {original && (
              <details className="mt-3 text-xs text-soft">
                <summary className="cursor-pointer">Your original note</summary>
                <p className="mt-2 leading-5">{original}</p>
              </details>
            )}
            <p className="mt-3 text-xs text-soft">
              This reply is not shown on the public tree.
            </p>
          </section>
        )}
        <VisitorAccess leafId={leaf.id} />
        <section
          className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground"
          aria-label="Your public leaf"
        >
          <Sprout size={26} className="shrink-0 text-accent" />
          <div>
            <p className="mb-1 text-xs text-white/45">On the shared tree</p>
            <blockquote className="text-sm leading-5">
              “{leaf.leaf_message}”
            </blockquote>
            {leaf.post_slug ? (
              <Link
                href={`/posts/${leaf.post_slug}`}
                className="mt-2 inline-flex items-center gap-1 text-xs underline underline-offset-4"
              >
                Read the full post <ArrowUpRight size={11} />
              </Link>
            ) : null}
          </div>
        </section>
        <GuideRecommendation path={leaf.chamber_id} reason={leaf.chamber_reason} />
        <ReceiptTree leaf={leaf} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={share}
            className="w-full sm:w-auto"
          >
            <Share2 size={13} />
            Share leaf
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={download}
            className="w-full sm:w-auto"
          >
            <Download size={13} />
            Save keepsake
          </Button>
          <Link
            href={`/leaf/${leaf.id}`}
            className="w-full sm:w-auto flex min-h-10 items-center justify-center gap-1 rounded-full bg-muted px-2 text-center text-xs"
          >
            Open your keepsake page
            <ArrowUpRight size={12} className="shrink-0" />
          </Link>
        </div>
        <div className="text-center">
          <Link
            href={`/display?leaf=${leaf.id}`}
            className="text-xs text-soft underline underline-offset-4"
          >
            See it on the shared tree
          </Link>
        </div>
        {notice && (
          <p
            role="status"
            className="break-all text-center text-xs text-soft"
          >
            {notice}
          </p>
        )}
      </div>
    );
  return (
    <div className="space-y-6 soft-in">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent/50">
          <Check size={21} />
        </span>
        <p className="eyebrow mb-3 text-soft">
          {keepsake
            ? "A hope to carry with you"
            : "Your voice is part of the canopy"}
        </p>
        <h1 className="text-4xl tracking-tight">
          {keepsake ? "One leaf. A shared future." : "Your leaf is growing."}
        </h1>
        <p className="mt-3 text-sm text-soft">
          {keepsake
            ? "A little keepsake from the BI Tree."
            : `Look for leaf #${leaf.id.slice(0, 6)} on the big screen. You've helped the tree grow.`}
        </p>
        {!keepsake ? (
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[11px] text-soft">
            <ShieldCheck size={12} aria-hidden="true" />
            Checked before publication · staff can review it privately
          </p>
        ) : null}
      </div>
      <section className="keepsake forest grain relative overflow-hidden rounded-[32px] px-7 pb-8 pt-9 text-center">
        <p className="eyebrow text-xs text-accent">
          BI Tree
        </p>
        <svg
          className="mx-auto my-5 h-28 w-24"
          viewBox="0 0 100 120"
          aria-hidden="true"
        >
          <path
            d="M50 105C-5 75 5 18 60 8C105 35 100 88 50 105Z"
            fill={theme.color}
          />
          <path
            d="M46 111L60 26"
            fill="none"
            stroke="#faf0cb"
            strokeWidth="1.5"
            opacity=".55"
          />
        </svg>
        <blockquote className="serif mx-auto max-w-sm text-[27px] leading-snug">
          &ldquo;{leaf.leaf_message}&rdquo;
        </blockquote>
        <p
          className="mt-6 text-xs tracking-[.15em]"
          style={{ color: theme.color }}
        >
          {theme.label}
        </p>
        <p className="mt-5 rounded-full bg-white/5 px-3 py-3 text-xs text-white/45">
          {leaf.is_demo ? "Illustrative demo leaf · " : ""}Anonymous hope ·{" "}
          {new Date(leaf.created_at).toLocaleDateString("en-GB", {
            timeZone: "Asia/Thimphu",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </section>
      {keepsake && leaf.post_slug ? (
        <Link
          href={`/posts/${leaf.post_slug}`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-card px-4 text-xs font-medium"
        >
          Read the full aspiration or idea <ArrowUpRight size={14} />
        </Link>
      ) : null}
      <div className="no-print grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={share}>
          <Share2 size={15} />
          Share leaf
        </Button>
        <Button variant="secondary" onClick={download}>
          <Download size={15} />
          Save keepsake
        </Button>
      </div>
      <p className="no-print text-center">
        <Link
          href={`/display?leaf=${leaf.id}`}
          className="text-xs text-soft underline underline-offset-4"
        >
          See it on the shared tree
        </Link>
      </p>
      <p
        role="status"
        className="break-all text-center text-xs text-soft"
      >
        {notice}
      </p>
      <ReceiptTree
        leaf={leaf}
        title="This leaf, on the living tree."
        subtitle={`The living tree right now · Leaf #${leaf.id.slice(0, 6)} is highlighted.`}
      />
      <GuideRecommendation path={leaf.chamber_id} reason={leaf.chamber_reason} />
      <p className="text-center text-xs leading-relaxed text-soft">
        {leaf.mode === "offline"
          ? "Your leaf uses a curated offline response inspired by your theme and keywords."
          : "Your leaf was interpreted by the BI Tree AI and checked before publication."}{" "}
        Guide paths are suggestions, not official routes.
      </p>
      {!keepsake && (
        <Link
          href={`/leaf/${leaf.id}`}
          className="flex min-h-11 items-center justify-center gap-2 text-xs underline underline-offset-4"
        >
          <Copy size={13} />
          Open your keepsake page
        </Link>
      )}
      {keepsake && (
        <div className="no-print text-center">
          <Button asChild>
            <Link href="/join">
              Grow your own leaf <Sprout size={16} />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
