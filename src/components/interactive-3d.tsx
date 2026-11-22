"use client";
import { useEffect } from "react";

/** Cards that tilt in 3D toward the pointer. */
const TILT =
  ".home-story-card, .canopy-card, .theme-slice, .community-card, .place-card, .toolbox-link";
/** Primary actions that pull gently toward the pointer. */
const MAGNET =
  ".hero-cta, .closing-primary, .closing-secondary, .site-header-grow, .site-header-idea";

/**
 * One global pointer layer for the whole site. It works through event
 * delegation, so no page markup changes: cards gain a 3D tilt and primary
 * buttons a magnetic pull. Mouse and fine-pointer devices only, and it stays
 * off for visitors who ask for reduced motion.
 */
export function Interactive3D() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let active: HTMLElement | null = null;
    let frame = 0;
    let latest: PointerEvent | null = null;

    const reset = (el: HTMLElement) => {
      el.style.transform = "";
      el.style.transition = "";
    };

    const update = () => {
      frame = 0;
      const event = latest;
      if (!event) return;
      const target = event.target instanceof Element ? event.target : null;
      const tilt = target?.closest<HTMLElement>(TILT) ?? null;
      const magnet = tilt ? null : (target?.closest<HTMLElement>(MAGNET) ?? null);
      const el = tilt ?? magnet;

      if (active && active !== el) {
        reset(active);
        active = null;
      }
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      active = el;
      el.style.transition = "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)";

      if (tilt) {
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        el.style.transform = `perspective(900px) translateY(-4px) rotateX(${(-ny * 5).toFixed(2)}deg) rotateY(${(nx * 7).toFixed(2)}deg)`;
      } else {
        const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.22;
        const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.3;
        el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      latest = event;
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Leaving the window (no related target) releases whatever is active.
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null && active) {
        reset(active);
        active = null;
      }
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      if (frame) cancelAnimationFrame(frame);
      if (active) reset(active);
    };
  }, []);

  return null;
}
