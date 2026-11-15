"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Real sharing: the native share sheet where it exists, clipboard elsewhere.
 * Falls back to a prompt only if both are unavailable (older locked-down
 * webviews), so the control is never a decorative button.
 */
export function ShareButton({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* The visitor dismissed the sheet; fall through to copying. */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} className="community-share">
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
