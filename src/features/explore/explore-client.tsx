"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ExternalLink, UtensilsCrossed } from "lucide-react";
import { guidePaths, pathDetails, type GuidePathId } from "@/lib/catalog";
import {
  bhutanFolktales,
  bhutanPlaces,
  GUIDE_TIP,
  type GuideFolktale,
  type GuidePlace,
  type PlaceKind,
} from "@/lib/bhutan-guide";
import { GuideChat } from "./guide-chat";

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

function PlaceCard({ place }: { place: GuidePlace }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card text-left">
      {place.image_url ? (
        <>
          <img
            src={place.image_url}
            alt={place.name}
            loading="lazy"
            className="h-40 w-full object-cover"
          />
          <p className="px-4 pt-2 text-[10px] text-foreground/50">
            {place.image_credit}
          </p>
        </>
      ) : (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-muted px-4 text-foreground/55">
          <UtensilsCrossed size={26} strokeWidth={1.5} />
          <p className="text-center text-[10px] leading-relaxed">
            No freely licensed photo of this business yet — we do not invent
            imagery.
          </p>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-foreground/55">
            {place.region}
          </span>
          <a
            href={place.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[10px] text-foreground/60 hover:underline"
          >
            {place.source_label} <ExternalLink size={10} />
          </a>
        </div>
        <h3 className="mt-1 text-base font-semibold leading-snug">
          {place.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-foreground/70">
          {place.blurb}
        </p>
      </div>
    </article>
  );
}

function FolktaleCard({ tale }: { tale: GuideFolktale }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card text-left">
      <img
        src={tale.image_url}
        alt={tale.title}
        loading="lazy"
        className="h-44 w-full object-cover"
      />
      <p className="px-4 pt-2 text-[10px] text-foreground/50">
        {tale.image_credit}
      </p>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] uppercase tracking-wide text-foreground/55">
          {tale.tradition}
        </p>
        <h3 className="mt-1 text-lg leading-snug">{tale.title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-foreground/70">
          {tale.story}
        </p>
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[11px] italic leading-relaxed text-foreground/75">
          Moral: {tale.moral}
        </p>
        <a
          href={tale.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10px] text-foreground/60 hover:underline"
        >
          {tale.source_label} <ExternalLink size={10} />
        </a>
      </div>
    </article>
  );
}

export function ExploreClient() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = Number(params.get("path"));
  const [path, setPath] = useState<0 | GuidePathId>(
    raw >= 1 && raw <= 4 ? (raw as GuidePathId) : 0,
  );
  const visibleKinds = path === 0 ? ALL_KINDS : [KIND_FOR_PATH[path]];

  function select(next: 0 | GuidePathId) {
    setPath(next);
    router.replace(next === 0 ? "/explore" : `/explore?path=${next}`, {
      scroll: false,
    });
  }

  return (
    <>
      <p className="eyebrow text-foreground/45">Explore Bhutan</p>
      <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">
        Grow where your hope points.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/70">
        Real temples, valleys, kitchens and folktales — curated and sourced —
        plus an AI guide that turns a wandering question into places worth
        walking towards.
      </p>
      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter places by guide path"
      >
        <button
          type="button"
          aria-pressed={path === 0}
          onClick={() => select(0)}
          className={`min-h-9 rounded-full px-4 text-xs font-medium transition ${
            path === 0
              ? "bg-primary text-primary-foreground"
              : "border border-border text-foreground/70 hover:bg-muted"
          }`}
        >
          All
        </button>
        {([1, 2, 3, 4] as GuidePathId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={path === id}
            onClick={() => select(id)}
            className={`min-h-9 rounded-full px-4 text-xs font-medium transition ${
              path === id
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground/70 hover:bg-muted"
            }`}
          >
            {id} · {pathDetails[id].short}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <GuideChat />
      </div>
      {visibleKinds.map((kind) => {
        const places = bhutanPlaces.filter((place) => place.kind === kind);
        if (!places.length) return null;
        return (
          <section key={kind} className="mt-10" aria-label={KIND_LABEL[kind]}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl">{KIND_LABEL[kind]}</h2>
              <p className="text-xs text-foreground/55">
                {places.length}{" "}
                {places.length === 1 ? "entry" : "entries"}
                {kind === "restaurant" ? " · details from Wikivoyage" : ""}
              </p>
            </div>
            {kind === "restaurant" && (
              <p className="bi-tree-fact text-xs text-foreground/70">
                {GUIDE_TIP}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        );
      })}
      <section className="mt-10" aria-label="Bhutanese folktales">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl">Folktales to carry home</h2>
          <p className="text-xs text-foreground/55">
            {bhutanFolktales.length} stories · retold with sources
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bhutanFolktales.map((tale) => (
            <FolktaleCard key={tale.id} tale={tale} />
          ))}
        </div>
      </section>
      <p className="mt-10 text-[11px] leading-relaxed text-foreground/50">
        Every place and story above is a real, sourced entry; photos come from
        Wikimedia Commons with the licence credited under each image, and
        restaurant details were checked against Wikivoyage city guides on
        2026-11-14. Hours and prices change — treat listings as pointers, not
        guarantees. The AI guide answers from this data only and never invents
        places, prices or opening hours.
      </p>
    </>
  );
}

