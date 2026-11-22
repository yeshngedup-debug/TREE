"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Leaf,
  PenLine,
  Sprout,
  TreePine,
} from "lucide-react";
import { useTree } from "@/hooks/use-tree";
import { TreeCanvas } from "@/features/display/tree-canvas";
import { ThemeIcon } from "@/components/theme-icon";
import { Skeleton } from "@/components/skeletons";
import { themes, themeFor } from "@/lib/catalog";
import { VisitorPaths } from "./visitor-paths";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const photos: Record<string, string> = {
  nature: "phobjikha-valley",
  innovation: "dochula-pass",
  education: "taktsang-monastery",
  community: "punakha-dzong",
  wellbeing: "khamsum-chorten",
  culture: "rinpung-dzong",
};

const places = [
  "Paro Taktsang",
  "Punakha Dzong",
  "Phobjikha Valley",
  "Dochula Pass",
  "Rinpung Dzong",
  "Jakar Dzong",
  "Chimi Lhakhang",
  "Royal Takin Preserve",
];

const story = [
  {
    icon: PenLine,
    title: "Write one honest hope.",
    text: "Pick what you care about and say it in your own words. No name, no email, no account.",
  },
  {
    icon: Eye,
    title: "A person reads it first.",
    text: "Every note is checked privately before it appears, so the tree stays kind and on topic.",
  },
  {
    icon: TreePine,
    title: "It becomes a leaf.",
    text: "Your hope joins the shared tree, and you keep a private link to find your leaf again.",
  },
];

const statement: { word: string; accent?: boolean }[] = [
  { word: "A" },
  { word: "country" },
  { word: "is" },
  { word: "not" },
  { word: "only" },
  { word: "the" },
  { word: "land" },
  { word: "it" },
  { word: "keeps." },
  { word: "It" },
  { word: "is" },
  { word: "the" },
  { word: "future" },
  { word: "its" },
  { word: "people" },
  { word: "choose" },
  { word: "to" },
  { word: "imagine", accent: true },
  { word: "together.", accent: true },
];

const ARRIVAL_MS = 7000;

/**
 * Leaves that joined the tree while this page was open. The first settled
 * snapshot is the baseline, so a reload never replays every existing leaf.
 */
function useArrivals(ids: readonly string[], ready: boolean) {
  const known = useRef<Set<string> | null>(null);
  const [arrivals, setArrivals] = useState<string[]>([]);
  const key = ids.join("|");

  useEffect(() => {
    if (!ready) return;
    const current = key ? key.split("|") : [];
    if (!known.current) {
      known.current = new Set(current);
      return;
    }
    const fresh = current.filter((id) => !known.current?.has(id));
    for (const id of current) known.current.add(id);
    if (!fresh.length) return;
    setArrivals((previous) => [...previous, ...fresh]);
    const timer = window.setTimeout(() => {
      setArrivals((previous) => previous.filter((id) => !fresh.includes(id)));
    }, ARRIVAL_MS);
    return () => window.clearTimeout(timer);
  }, [key, ready]);

  return arrivals;
}

function ThemeBranches() {
  return (
    <section
      className="home-section home-section-tight"
      aria-labelledby="branches-title"
    >
      <div data-reveal>
        <p className="home-eyebrow">Six branches</p>
        <h2 className="home-h2" id="branches-title">
          Begin where your hope already lives.
        </h2>
        <p>Choose a branch to start your leaf with that theme.</p>
      </div>
      <div className="theme-rail" data-reveal>
        {themes.map((theme) => (
          <Link
            key={theme.id}
            href={`/join?theme=${theme.id}`}
            className="theme-slice"
            style={{ "--tone": theme.color } as CSSProperties}
          >
            <span
              className="theme-slice-img"
              style={{
                backgroundImage: `url(/images/bhutan/${photos[theme.id] ?? photos.community}.jpg)`,
              }}
              aria-hidden="true"
            />
            <span className="theme-slice-tint" aria-hidden="true" />
            <span className="theme-slice-shade" aria-hidden="true" />
            <span className="theme-slice-icon">
              <ThemeIcon theme={theme.id} size={17} />
            </span>
            <span className="theme-slice-vertical" aria-hidden="true">
              {theme.short}
            </span>
            <div className="theme-slice-panel">
              <h3>{theme.label}</h3>
              <p>{theme.message}</p>
              <span className="theme-slice-cta">
                Choose this branch <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeExperience() {
  const { tree, ready, connection } = useTree();
  const scope = useRef<HTMLDivElement>(null);
  const publicLeaves = tree.leaves.filter((leaf) => !leaf.is_demo).slice(0, 3);
  const arrivals = useArrivals(
    tree.leaves.map((leaf) => leaf.id),
    ready,
  );
  const latestArrival = arrivals.length
    ? tree.leaves.find((leaf) => leaf.id === arrivals[arrivals.length - 1])
    : undefined;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .from(".hero-tree-frame", { opacity: 0, duration: 1.4, ease: "power2.out" }, 0)
          .from(".hero-tree-canvas", { scale: 1.08, duration: 2.2, ease: "power3.out" }, 0)
          .from(".hero-kicker", { y: 16, opacity: 0, duration: 0.7 }, 0.15)
          .from(".hero-line > span", { yPercent: 112, duration: 1.05, stagger: 0.1 }, 0.2)
          .from(".hero-description", { y: 18, opacity: 0, duration: 0.8 }, 0.5)
          .from(".hero-copy nav", { y: 18, opacity: 0, duration: 0.8 }, 0.62)
          .from(".hero-tree-link, .hero-scroll", { opacity: 0, duration: 0.7 }, 1);

        // The canopy drifts and the copy lets go as the page moves on.
        gsap.to(".hero-tree-canvas", {
          yPercent: 7,
          ease: "none",
          scrollTrigger: {
            trigger: ".home-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
        gsap.to(".hero-copy", {
          y: -48,
          opacity: 0.15,
          ease: "none",
          scrollTrigger: {
            trigger: ".home-hero",
            start: "30% top",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.from(".home-marquee-item", {
          opacity: 0,
          y: 18,
          duration: 1,
          stagger: 0.03,
          ease: "power2.out",
          scrollTrigger: { trigger: ".home-marquee", start: "top 94%" },
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 36,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 90%" },
          });
        });

        gsap.from(".home-story-card", {
          y: 44,
          opacity: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: ".home-story-grid", start: "top 86%" },
        });

        gsap.fromTo(
          ".statement-word",
          { opacity: 0.14 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.5,
            scrollTrigger: {
              trigger: ".statement-card",
              start: "top 78%",
              end: "bottom 58%",
              scrub: 0.4,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <section className="home-hero">
        <div className="home-hero-card">
          <div className="home-tree hero-tree-frame">
            <TreeCanvas
              leaves={tree.leaves}
              settings={tree.settings}
              contributionCount={tree.total}
              arrivalId={arrivals[arrivals.length - 1]}
              arrivalIds={arrivals}
              className="hero-tree-canvas"
              environment="garden"
              composition="portrait"
            />
            <div className="hero-tree-atmosphere" aria-hidden="true" />
            <Link href="/display" className="hero-tree-link">
              See the tree up close{" "}
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero-copy">
            <p className="hero-kicker">
              <span className="hero-kicker-dot" aria-hidden="true" /> A living
              tree of Bhutanese hopes
            </p>
            <h1 className="hero-title">
              <span className="hero-line">
                <span>Bhutan grows.</span>
              </span>{" "}
              <span className="hero-line">
                <span>
                  So do our <span className="hero-highlight">hopes.</span>
                </span>
              </span>
            </h1>
            <p className="hero-description">
              What would you like to see growing in Bhutan? Leave a hope on the
              tree, or share an idea for making it happen.
            </p>
            <VisitorPaths />
          </div>
          <div aria-live="polite">
            {latestArrival ? (
              <p className="hero-arrival" key={latestArrival.id}>
                <span className="hero-arrival-dot" aria-hidden="true" />
                A new {themeFor(latestArrival.category).short.toLowerCase()} leaf
                just joined the tree
              </p>
            ) : null}
          </div>
          <a href="#canopy" className="hero-scroll">
            See what is growing <ArrowDown size={13} aria-hidden="true" />
          </a>
        </div>
      </section>

      <div className="home-marquee" aria-hidden="true">
        <div className="home-marquee-track">
          {[0, 1].map((group) => (
            <div className="home-marquee-group" key={group}>
              {places.map((place) => (
                <span className="home-marquee-item" key={place}>
                  {place}
                  <Leaf
                    className="home-marquee-leaf"
                    size={22}
                    strokeWidth={1.4}
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="home-story" aria-labelledby="story-title">
        <div data-reveal>
          <p className="home-eyebrow">How it works</p>
          <h2 className="home-h2" id="story-title">
            From a thought to a leaf, in three steps.
          </h2>
        </div>
        <ol className="home-story-grid">
          {story.map(({ icon: Icon, title, text }, index) => (
            <li className="home-story-card" key={title}>
              <div className="home-story-top">
                <span className="home-story-number">0{index + 1}</span>
                <span className="home-story-icon" aria-hidden="true">
                  <Icon size={19} strokeWidth={1.6} />
                </span>
              </div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="home-section canopy-section"
        id="canopy"
        aria-labelledby="canopy-title"
      >
        <div className="home-heading-row" data-reveal>
          <div>
            <p className="home-eyebrow">From the canopy</p>
            <h2 className="home-h2" id="canopy-title">
              Hopes that have already taken root.
            </h2>
          </div>
          <Link href="/discover" className="home-text-link">
            Read the grove <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {!ready && connection !== "reconnecting" ? (
          <div
            className="canopy-grid"
            aria-busy="true"
            aria-label="Loading recent hopes"
          >
            {[0, 1, 2].map((n) => (
              <Skeleton className="canopy-skeleton" key={n} />
            ))}
          </div>
        ) : publicLeaves.length ? (
          <ul className="canopy-grid">
            {publicLeaves.map((leaf) => (
              <li key={leaf.id}>
                <Link
                  href={`/leaf/${leaf.id}`}
                  className="canopy-card"
                  style={
                    { "--tone": themeFor(leaf.category).color } as CSSProperties
                  }
                >
                  <span className="canopy-theme">
                    <ThemeIcon theme={leaf.category} size={14} />
                    {themeFor(leaf.category).short}
                  </span>
                  <blockquote>“{leaf.leaf_message}”</blockquote>
                  <span className="canopy-meta">Read this leaf</span>
                  <span className="canopy-arrow" aria-hidden="true">
                    <ArrowUpRight size={15} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="canopy-empty">
            <div className="canopy-empty-copy">
              {!ready || tree.statsUnavailable ? (
                <>
                  <h3>The canopy is reconnecting.</h3>
                  <p>
                    You can still browse the community while the tree catches
                    up.
                  </p>
                  <Link className="home-text-link" href="/discover">
                    Browse community ideas
                  </Link>
                </>
              ) : (
                <>
                  <h3>The canopy is young.</h3>
                  <p>
                    No public hopes are on display yet. What would you like the
                    first leaf to say?
                  </p>
                  <Link className="hero-cta hero-cta-primary" href="/join">
                    Add the first hope{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
            <figure className="canopy-sample">
              <figcaption className="canopy-sample-badge">
                Example, not a submission
              </figcaption>
              <blockquote>
                “I hope Bhutan’s forests and green spaces keep thriving for
                generations.”
              </blockquote>
            </figure>
          </div>
        )}
      </section>

      <ThemeBranches />

      <section className="home-statement">
        <div className="statement-card">
          <p className="statement-text">
            {statement.map(({ word, accent }, index) => (
              <span
                key={`${word}-${index}`}
                className={
                  accent ? "statement-word statement-accent" : "statement-word"
                }
              >
                {word}
                {index < statement.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
          <p className="statement-foot">
            Rooted in values. Growing through people.
          </p>
        </div>
      </section>
    </div>
  );
}

export function HomeClosing() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".closing-card > *", {
          y: 30,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".closing-card", start: "top 84%" },
        });
        gsap.to(".closing-sprout", {
          rotate: 10,
          yPercent: -8,
          ease: "none",
          scrollTrigger: {
            trigger: ".closing-card",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <section className="home-closing" ref={scope}>
      <div className="closing-card">
        <Sprout
          className="closing-sprout"
          size={460}
          strokeWidth={0.5}
          aria-hidden="true"
        />
        <p className="home-eyebrow">Your turn</p>
        <h2>One leaf. One hope. One Bhutan.</h2>
        <p className="closing-copy">
          Think of a place, a person, or a tradition you want to see thrive.
          Start there.
        </p>
        <div className="closing-actions">
          <Link className="closing-primary" href="/join">
            Add your hope <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link className="closing-secondary" href="/discover">
            Read the community <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
