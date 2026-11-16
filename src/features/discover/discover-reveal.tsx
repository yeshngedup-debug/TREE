"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function DiscoverReveal({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .from(".discover-kicker", { y: 16, opacity: 0, duration: 0.7 }, 0.05)
          .from(
            ".discover-line > span",
            { yPercent: 112, duration: 1.05, stagger: 0.09 },
            0.1,
          )
          .from(".discover-lede", { y: 18, opacity: 0, duration: 0.8 }, 0.42)
          .from(
            ".discover-actions > *",
            { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 },
            0.52,
          )
          .from(
            ".grove-card",
            { scale: 0.96, opacity: 0, duration: 1.15, ease: "power2.out" },
            0.25,
          );

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 36,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 90%" },
          });
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
