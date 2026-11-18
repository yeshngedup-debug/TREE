"use client";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Leaf,
  Move3D,
  Sprout,
} from "lucide-react";
import { useTree } from "@/hooks/use-tree";
import { TreeCanvas } from "@/features/display/tree-canvas";
import { ThemeIcon } from "@/components/theme-icon";
import { Skeleton } from "@/components/skeletons";
import { themes, themeFor } from "@/lib/catalog";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* Real, freely licensed Bhutan photography (Wikimedia Commons). */
const photo = {
  tigersNest:
    "/images/bhutan/taktsang-monastery.jpg",
  punakha:
    "/images/bhutan/punakha-dzong.jpg",
  phobjikha:
    "/images/bhutan/phobjikha-valley.jpg",
  dochula:
    "/images/bhutan/dochula-pass.jpg",
  khamsum:
    "/images/bhutan/khamsum-chorten.jpg",
  rinpung:
    "/images/bhutan/rinpung-dzong.jpg",
};

const themePhoto: Record<string, string> = {
  nature: photo.phobjikha,
  innovation: photo.dochula,
  education: photo.tigersNest,
  community: photo.punakha,
  wellbeing: photo.khamsum,
  culture: photo.rinpung,
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

function leafAge(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "recently";
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(time);
}

export function HomeExperience() {
  const { tree, ready } = useTree();
  const publicLeaves = tree.leaves
    .filter((leaf) => !leaf.is_demo)
    .slice(0, 3);
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .from(".hero-kicker", { y: 16, opacity: 0, duration: 0.7 }, 0.05)
          .from(
            ".hero-line > span",
            { yPercent: 112, duration: 1.05, stagger: 0.1 },
            0.1,
          )
          .from(
            ".hero-description",
            { y: 18, opacity: 0, duration: 0.8 },
            0.42,
          )
          .from(
            ".hero-actions > *",
            { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 },
            0.52,
          )
          .from(".hero-note", { opacity: 0, duration: 0.6 }, 0.7)
          .from(
            ".hero-tree-frame",
            { scale: 0.965, opacity: 0, duration: 1.15, ease: "power2.out" },
            0.25,
          )
          .from(".hero-tree-link", { y: 10, opacity: 0, duration: 0.6 }, 0.9);

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
          <div className="hero-copy">
            <p className="hero-kicker">
              <span className="hero-kicker-dot" aria-hidden="true" />
              A living tree of Bhutanese hopes
            </p>
            <h1 className="hero-title">
              <span className="hero-line">
                <span>
                  <span
                    className="hero-inline-photo"
                    style={{ backgroundImage: `url(${photo.phobjikha})` }}
                    aria-hidden="true"
                  />{" "}
                  Bhutan grows.
                </span>
              </span>
              <span className="hero-line">
                <span>
                  So do our <span className="hero-highlight">hopes.</span>
                </span>
              </span>
            </h1>
            <p className="hero-description">
              This is a shared tree of aspirations for Bhutan. Pick what you
              care about, leave one honest hope, and watch it take its place in
              the canopy.
            </p>
            <div className="hero-actions">
              <Link className="hero-cta hero-cta-primary" href="/join">
                Grow your leaf <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <Link className="hero-cta hero-cta-secondary" href="/explore">
                Wander Bhutan <Compass size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className="hero-note">
              No account. Just a minute and one honest hope.
            </p>
          </div>
          <div className="home-tree hero-tree-frame">
            <TreeCanvas
              leaves={tree.leaves}
              settings={tree.settings}
              contributionCount={tree.total}
              className="hero-tree-canvas"
              showControls={false}
              environment="garden"
              composition="portrait"
            />
            <div className="hero-tree-atmosphere" aria-hidden="true" />
            <span className="hero-tree-hint" aria-hidden="true">
              <Move3D size={12} aria-hidden="true" />
              Drag to orbit · Scroll to zoom
            </span>
            <Link href="/display" className="hero-tree-link">
              See the tree up close <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="home-marquee" aria-hidden="true">
        <div className="home-marquee-track">
          {[0, 1].map((group) => (
            <div className="home-marquee-group" key={group}>
              {places.map((place) => (
                <span className="home-marquee-item" key={`${group}-${place}`}>
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

      <section className="home-section">
        <div className="home-heading-row">
          <div>
            <p className="home-eyebrow">From a single voice</p>
            <h2 className="home-h2">
              A wish becomes a leaf. A leaf becomes a trail.
            </h2>
          </div>
          <Link href="/join" className="home-text-link">
            Make it part of the story{" "}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-bento">
          <article className="bento-card bento-a" data-reveal>
            <div className="bento-media">
              <img
                src={photo.tigersNest}
                alt="Paro Taktsang (Tiger's Nest) monastery above the Paro Valley"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="bento-shade" aria-hidden="true" />
            <span className="bento-icon">
              <Sprout size={20} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <div className="bento-content">
              <h3>One tree, grown by everyone.</h3>
              <p>
                Every approved hope becomes a leaf on a living 3D tree, carried
                from phones to festivals across the kingdom.
              </p>
              <span className="bento-live">
                <span className="bento-live-dot" aria-hidden="true" />
                {!ready ? (
                  "Connecting to the canopy…"
                ) : tree.total > 0 ? (
                  <>
                    <strong>{tree.total}</strong>{" "}
                    {tree.total === 1 ? "hope" : "hopes"} taking root
                  </>
                ) : (
                  "The first hope is waiting"
                )}
              </span>
            </div>
          </article>
          <Link href="/explore" className="bento-card bento-b" data-reveal>
            <span className="bento-top">
              <span className="bento-icon">
                <Compass size={20} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="bento-arrow">
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </span>
            <div>
              <h3>A leaf becomes a trail.</h3>
              <p>
                Your theme opens a guide through cliffside monasteries, crane
                valleys, kitchens and folktales.
              </p>
            </div>
          </Link>
          <div className="bento-card bento-c" data-reveal>
            <span className="bento-top">
              <span className="bento-icon">
                <Leaf size={20} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="bento-arrow" aria-hidden="true">
                <ArrowUpRight size={16} />
              </span>
            </span>
            <div>
              <h3>A trail becomes tomorrow.</h3>
              <p>
                Add one hope in under a minute. No account, no noise — just your
                voice in the canopy.
              </p>
              <Link href="/join" className="home-text-link bento-link">
                Start with one hope <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="home-section home-section-tight canopy-section"
        aria-labelledby="canopy-title"
      >
        <div className="home-heading-row">
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

        {!ready ? (
          <div
            className="canopy-grid"
            aria-busy="true"
            aria-label="Loading recent hopes from the tree"
          >
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="canopy-skeleton" />
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
                    {
                      "--tone": themeFor(leaf.category).color,
                    } as CSSProperties
                  }
                >
                  <span className="canopy-theme">
                    <ThemeIcon theme={leaf.category} size={14} />
                    {themeFor(leaf.category).short}
                  </span>
                  <blockquote>“{leaf.leaf_message}”</blockquote>
                  <span className="canopy-meta">
                    Leaf #{leaf.id.slice(0, 6)} · {leafAge(leaf.created_at)}
                  </span>
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
              <h3>The canopy is young.</h3>
              <p>
                No public hopes have landed here yet. The first leaf is yours
                to plant — it takes about a minute, and no account is needed.
              </p>
              <div className="canopy-empty-actions">
                <Link className="hero-cta hero-cta-primary" href="/join">
                  Add the first hope
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/explore" className="home-text-link">
                  Or wander Bhutan first
                </Link>
              </div>
            </div>
            <figure className="canopy-sample">
              <figcaption className="canopy-sample-badge">
                Example, not a submission
              </figcaption>
              <blockquote>
                “I hope Bhutan&rsquo;s forests and green spaces keep thriving
                for generations.”
              </blockquote>
              <p>What a leaf can look like · Nature</p>
            </figure>
          </div>
        )}
      </section>

      <section className="home-section home-section-tight">
        <p className="home-eyebrow">Six branches</p>
        <h2 className="home-h2">Begin where your hope already lives.</h2>
        <div className="theme-rail">
          {themes.map((theme) => (
            <Link
              key={theme.id}
              href={`/join?theme=${theme.id}`}
              className="theme-slice"
              style={{ "--tone": theme.color } as CSSProperties}
              data-reveal
            >
              <span
                className="theme-slice-img"
                style={{
                  backgroundImage: `url(${themePhoto[theme.id] ?? photo.punakha})`,
                }}
                aria-hidden="true"
              />
              <span className="theme-slice-tint" aria-hidden="true" />
              <span className="theme-slice-shade" aria-hidden="true" />
              <span className="theme-slice-icon">
                <ThemeIcon theme={theme.id} size={17} />
              </span>
              <span className="theme-slice-vertical">{theme.short}</span>
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
          The canopy is still growing. Add the future you want to see, then
          follow the hopes of people you have never met.
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
