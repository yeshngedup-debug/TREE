"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Leaf,
  Sprout,
  UtensilsCrossed,
} from "lucide-react";
import { guidePaths, pathDetails, type GuidePathId } from "@/lib/catalog";
import {
  bhutanFolktales,
  bhutanPlaces,
  GUIDE_TIP,
  type GuidePlace,
  type PlaceKind,
} from "@/lib/bhutan-guide";
import { GuideChat } from "./guide-chat";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const KIND_FOR_PATH: Record<GuidePathId, PlaceKind> = {
  1: "temple",
  2: "nature",
  3: "restaurant",
  4: "heritage",
};
const KIND_LABEL: Record<PlaceKind, string> = {
  temple: "Temples & monasteries",
  nature: "Valleys & nature",
  restaurant: "Taste of Bhutan",
  heritage: "Dzongs & heritage",
};
const ALL_KINDS: PlaceKind[] = ["temple", "nature", "restaurant", "heritage"];

/* Real, freely licensed Bhutan photography (Wikimedia Commons), pulled from
   the sourced data rather than retyped. */
const taktsangPhoto =
  bhutanPlaces.find((place) => place.id === "taktsang")?.image_url ?? "";
const phobjikhaPhoto =
  bhutanPlaces.find((place) => place.id === "phobjikha")?.image_url ?? "";
const punakhaDzongPhoto =
  bhutanPlaces.find((place) => place.id === "punakha-dzong")?.image_url ?? "";

function pathCount(id: GuidePathId) {
  return bhutanPlaces.filter((place) => place.path === id).length;
}

const PATH_CARDS: Array<{
  id: GuidePathId;
  photo: string | null;
  note: string;
}> = [
  { id: 1, photo: taktsangPhoto, note: "Paro to Bumthang" },
  { id: 2, photo: phobjikhaPhoto, note: "Cranes, passes & forests" },
  { id: 3, photo: null, note: "" },
  { id: 4, photo: punakhaDzongPhoto, note: "Dzongs & six retold tales" },
];

function PlaceCard({ place }: { place: GuidePlace }) {
  return (
    <article className="place-card" data-reveal>
      {place.image_url ? (
        <>
          <div className="place-media">
            <img
              className="place-img"
              src={place.image_url}
              alt={place.name}
              loading="lazy"
              data-image-scale
            />
          </div>
          <p className="place-credit">{place.image_credit}</p>
        </>
      ) : (
        <div className="place-note">
          <UtensilsCrossed size={26} strokeWidth={1.5} aria-hidden="true" />
          <p>
            No freely licensed photo of this business yet — we do not invent
            imagery.
          </p>
        </div>
      )}
      <div className="place-body">
        <div className="place-top">
          <span className="place-region">{place.region}</span>
          <a
            className="place-source"
            href={place.source_url}
            target="_blank"
            rel="noreferrer"
          >
            {place.source_label} <ExternalLink size={10} aria-hidden="true" />
          </a>
        </div>
        <h3 className="place-name">{place.name}</h3>
        <p className="place-blurb">{place.blurb}</p>
      </div>
    </article>
  );
}

export function ExploreClient() {
  const router = useRouter();
  const params = useSearchParams();
  const scope = useRef<HTMLDivElement>(null);

  // The path filter is always derived from the URL — no parallel state.
  const raw = Number(params.get("path"));
  const path: 0 | GuidePathId =
    raw >= 1 && raw <= 4 ? (raw as GuidePathId) : 0;

  const visibleKinds = path === 0 ? ALL_KINDS : [KIND_FOR_PATH[path]];

  const uniqueCredits = useMemo(() => {
    const seen = new Set<string>();
    const credits: string[] = [];
    for (const item of [...bhutanPlaces, ...bhutanFolktales]) {
      const credit = item.image_credit;
      if (credit && !seen.has(credit)) {
        seen.add(credit);
        credits.push(credit);
      }
    }
    return credits;
  }, []);

  const [index, setIndex] = useState(0);
  const tale = bhutanFolktales[index];

  function select(next: 0 | GuidePathId) {
    router.replace(next === 0 ? "/explore" : `/explore?path=${next}`, {
      scroll: false,
    });
  }

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .from(".explore-kicker", { y: 16, opacity: 0, duration: 0.7 }, 0.05)
          .from(
            ".explore-line > span",
            { yPercent: 112, duration: 1.05, stagger: 0.09 },
            0.1,
          )
          .from(
            ".explore-lede",
            { y: 18, opacity: 0, duration: 0.8 },
            0.42,
          )
          .from(".explore-actions > *", { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.52)
          .from(
            ".explore-chips > *",
            { y: 14, opacity: 0, duration: 0.7, stagger: 0.06 },
            0.6,
          )
          .from(
            ".explore-photo-panel",
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

        gsap.utils.toArray<HTMLElement>(".place-img, .tale-img").forEach((image) => {
          gsap.fromTo(
            image,
            { scale: 0.8, opacity: 0.35 },
            {
              scale: 1,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: image,
                start: "top 92%",
                end: "bottom 60%",
                scrub: 0.4,
              },
            },
          );
          gsap.to(image, {
            opacity: 0.2,
            ease: "none",
            scrollTrigger: {
              trigger: image,
              start: "bottom 60%",
              end: "bottom 10%",
              scrub: 0.4,
            },
          });
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope}>
      {/* 1. Hero — editorial split --------------------------------------- */}
      <section className="explore-hero">
        <div className="explore-hero-grid">
          <div className="explore-copy">
            <p className="explore-kicker">Explore Bhutan</p>
            <h1 className="explore-title">
              <span className="explore-line">
                <span>Every hope has</span>
              </span>
              <span className="explore-line">
                <span>
                  a{" "}
                  <span
                    className="explore-inline-photo"
                    style={{ backgroundImage: `url(${taktsangPhoto})` }}
                    aria-hidden="true"
                  />{" "}
                  place to walk.
                </span>
              </span>
            </h1>
            <p className="explore-lede">
              Real temples, valleys, kitchens and folktales — curated and
              sourced — plus an AI guide that turns a wandering question into
              places worth walking towards.
            </p>
            <div className="explore-actions">
              <a
                className="explore-cta explore-cta-primary"
                href="#explore-guide"
              >
                Ask the guide a question{" "}
                <ArrowDownRight size={17} aria-hidden="true" />
              </a>
              <Link
                className="explore-cta explore-cta-secondary"
                href="/explore?path=1"
              >
                Walk the temple path{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div
              className="explore-chips"
              role="group"
              aria-label="Filter places by guide path"
            >
              <button
                type="button"
                className="explore-chip"
                aria-pressed={path === 0}
                data-active={path === 0 || undefined}
                onClick={() => select(0)}
              >
                All
              </button>
              {([1, 2, 3, 4] as GuidePathId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className="explore-chip"
                  aria-pressed={path === id}
                  data-active={path === id || undefined}
                  onClick={() => select(id)}
                >
                  {id} · {pathDetails[id].short}
                </button>
              ))}
            </div>
          </div>
          <div className="explore-photo-panel">
            <figure className="explore-photo-frame">
              <img
                className="explore-photo"
                src={taktsangPhoto}
                alt="Paro Taktsang at dusk, taken from the Paro Valley"
                loading="eager"
              />
              <span className="explore-photo-shade" aria-hidden="true" />
              <figcaption className="explore-photo-caption">
                Paro Taktsang · Photo: Wikimedia Commons CC BY-SA 4.0
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 2. Credit marquee ------------------------------------------------ */}
      <div className="explore-credits" aria-hidden="true">
        <div className="explore-credits-track">
          {[0, 1].map((group) => (
            <div className="explore-credits-group" key={group}>
              {uniqueCredits.map((credit) => (
                <span className="explore-credits-item" key={credit}>
                  <Leaf size={13} strokeWidth={1.6} aria-hidden="true" />
                  {credit}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Guide-paths bento -------------------------------------------- */}
      <section className="explore-section explore-paths" id="explore-paths">
        <div className="explore-head-row">
          <div>
            <p className="explore-eyebrow">Begin with</p>
            <h2 className="explore-h2">Four paths, one kingdom</h2>
          </div>
          <p className="explore-count">
            {bhutanPlaces.length} real entries · {bhutanFolktales.length}{" "}
            folktales
          </p>
        </div>
        <div className="explore-bento">
          {PATH_CARDS.map((card) => {
            const id = card.id;
            const count = pathCount(id);
            const title = guidePaths[id];
            const isType = card.photo === null;
            return (
              <Link
                key={id}
                href={`/explore?path=${id}`}
                className={`path-card ${
                  isType ? "path-card--type" : "path-card--photo"
                }`}
                data-reveal
              >
                {card.photo ? (
                  <>
                    <img
                      className="path-img"
                      src={card.photo}
                      alt=""
                      loading="lazy"
                    />
                    <span className="path-shade" aria-hidden="true" />
                    <span className="path-arrow" aria-hidden="true">
                      <ArrowUpRight size={18} strokeWidth={1.6} />
                    </span>
                  </>
                ) : null}
                <span className="path-content">
                  <span className="path-card-label">
                    {pathDetails[id].eyebrow}
                  </span>
                  <span className="path-card-title">{title}</span>
                  {isType ? (
                    <>
                      <span className="path-card-meta">
                        {count} kitchens · checked against Wikivoyage
                      </span>
                      <span className="path-note">
                        No freely licensed photos of these businesses exist — we
                        do not invent imagery.
                      </span>
                    </>
                  ) : (
                    <span className="path-card-meta">
                      {count} places · {card.note}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Place sections ------------------------------------------------ */}
      {visibleKinds.map((kind) => {
        const places = bhutanPlaces.filter((place) => place.kind === kind);
        if (!places.length) return null;
        return (
          <section
            key={kind}
            className="explore-kind"
            data-reveal
            aria-label={KIND_LABEL[kind]}
          >
            <div className="explore-kind-head">
              <h2 className="kind-title">{KIND_LABEL[kind]}</h2>
              <p className="kind-note">
                {places.length} {places.length === 1 ? "entry" : "entries"}
                {kind === "restaurant" ? " · details from Wikivoyage" : ""}
              </p>
            </div>
            {kind === "restaurant" && (
              <p className="bi-tree-fact kind-tip">{GUIDE_TIP}</p>
            )}
            <div className={`kind-grid kind-grid--${kind}`}>
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        );
      })}

      {/* 5. Folktales ----------------------------------------------------- */}
      <section
        className="explore-section explore-tales"
        data-reveal
        aria-label="Bhutanese folktales"
      >
        <div className="explore-kind-head">
          <h2 className="kind-title">Folktales to carry home</h2>
          <p className="explore-count">
            {`${bhutanFolktales.length} stories · retold with sources`}
          </p>
        </div>
        <div className="tale-rail">
          {bhutanFolktales.map((item) => (
            <div
              key={item.id}
              className="tale-slice"
              role="group"
              aria-label={item.title}
              tabIndex={0}
            >
              <div
                className="tale-img"
                style={{ backgroundImage: `url(${item.image_url})` }}
                aria-hidden="true"
              />
              <div className="tale-shade" aria-hidden="true" />
              <span className="tale-tradition">{item.tradition}</span>
              <div className="tale-panel">
                <span className="tale-title">{item.title}</span>
                <p className="tale-story">{item.story}</p>
                <p className="tale-moral">
                  <em>Moral:</em> {item.moral}
                </p>
                <a
                  className="tale-source"
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.source_label}{" "}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="wisdom">
          <div className="wisdom-photo-wrap">
            <img
              className="wisdom-photo"
              src={tale.image_url}
              alt={tale.title}
              loading="lazy"
            />
            <p className="wisdom-credit">{tale.image_credit}</p>
          </div>
          <div className="wisdom-body">
            <span className="wisdom-tradition">{tale.tradition}</span>
            <blockquote className="wisdom-quote" aria-live="polite">
              “{tale.moral}”
            </blockquote>
            <span className="wisdom-title">— {tale.title}</span>
            <div className="wisdom-controls">
              <button
                type="button"
                className="wisdom-prev"
                aria-label="Previous saying"
                onClick={() =>
                  setIndex(
                    (current) =>
                      (current - 1 + bhutanFolktales.length) %
                      bhutanFolktales.length,
                  )
                }
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="wisdom-next"
                aria-label="Next saying"
                onClick={() =>
                  setIndex(
                    (current) => (current + 1) % bhutanFolktales.length,
                  )
                }
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Guide panel --------------------------------------------------- */}
      <section
        id="explore-guide"
        className="explore-section guide-panel"
        data-reveal
      >
        <div className="guide-panel-card">
          <div className="guide-panel-copy">
            <p className="explore-eyebrow explore-eyebrow--clay">
              The BI Tree guide
            </p>
            <p className="guide-panel-text">
              Tashi delek. Ask anything — the guide answers only from the
              sourced entries on this page, and never invents places, prices or
              opening hours.
            </p>
          </div>
          <div className="guide-panel-chat">
            <GuideChat />
          </div>
        </div>
      </section>

      {/* 7. Sourcing note -------------------------------------------------- */}
      <p className="explore-sourcing">
        Every place and story above is a real, sourced entry; photos come from
        Wikimedia Commons with the licence credited under each image, and
        restaurant details were checked against Wikivoyage city guides on
        2026-11-14. Hours and prices change — treat listings as pointers, not
        guarantees. The AI guide answers from this data only and never invents
        places, prices or opening hours.
      </p>

      {/* 8. Closing CTA ----------------------------------------------------- */}
      <section className="explore-closing" data-reveal>
        <div className="explore-closing-card">
          <Sprout
            className="explore-closing-sprout"
            size={460}
            strokeWidth={0.5}
            aria-hidden="true"
          />
          <h2 className="explore-closing-title">
            The kingdom is already mapped.
          </h2>
          <p className="closing-copy">
            Start with one question, or walk straight into the paths above.
            Either way, every entry leads back to a real place.
          </p>
          <div className="closing-actions">
            <a
              className="explore-cta closing-primary"
              href="#explore-guide"
            >
              Ask the guide <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <Link className="explore-cta closing-secondary" href="/join">
              Grow your own leaf <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
