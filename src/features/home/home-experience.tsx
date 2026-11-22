"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Leaf, Move3D, Sprout } from "lucide-react";
import { useTree } from "@/hooks/use-tree";
import { TreeCanvas } from "@/features/display/tree-canvas";
import { ThemeIcon } from "@/components/theme-icon";
import { Skeleton } from "@/components/skeletons";
import { themes, themeFor } from "@/lib/catalog";
import { VisitorPaths } from "./visitor-paths";

const photos: Record<string, string> = {
  nature: "phobjikha-valley", innovation: "dochula-pass", education: "taktsang-monastery",
  community: "punakha-dzong", wellbeing: "khamsum-chorten", culture: "rinpung-dzong",
};
const places = ["Paro Taktsang", "Punakha Dzong", "Phobjikha Valley", "Dochula Pass", "Rinpung Dzong", "Jakar Dzong", "Chimi Lhakhang", "Royal Takin Preserve"];

function ThemeBranches() {
  return <section className="home-section home-section-tight" aria-labelledby="branches-title">
    <p className="home-eyebrow">Six branches</p>
    <h2 className="home-h2" id="branches-title">Begin where your hope already lives.</h2>
    <p>Choose a branch to start your leaf with that theme.</p>
    <div className="theme-rail">{themes.map(theme => <Link key={theme.id} href={`/join?theme=${theme.id}`} className="theme-slice" style={{"--tone":theme.color} as CSSProperties}>
      <span className="theme-slice-img" style={{backgroundImage:`url(/images/bhutan/${photos[theme.id] ?? photos.community}.jpg)`}} aria-hidden="true"/>
      <span className="theme-slice-tint" aria-hidden="true"/><span className="theme-slice-shade" aria-hidden="true"/>
      <span className="theme-slice-icon"><ThemeIcon theme={theme.id} size={17}/></span><span className="theme-slice-vertical" aria-hidden="true">{theme.short}</span>
      <div className="theme-slice-panel"><h3>{theme.label}</h3><p>{theme.message}</p><span className="theme-slice-cta">Choose this branch <ArrowRight size={13} aria-hidden="true"/></span></div>
    </Link>)}</div>
  </section>;
}

export function HomeExperience() {
  const { tree, ready, connection } = useTree();
  const publicLeaves = tree.leaves.filter(leaf => !leaf.is_demo).slice(0,3);
  return <div>
    <section className="home-hero"><div className="home-hero-card">
      <div className="hero-copy">
        <p className="hero-kicker"><span className="hero-kicker-dot" aria-hidden="true"/> A living tree of Bhutanese hopes</p>
        <h1 className="hero-title"><span className="hero-line"><span>Bhutan grows.</span></span>{" "}<span className="hero-line"><span>So do our <span className="hero-highlight">hopes.</span></span></span></h1>
        <p className="hero-description">What would you like to see growing in Bhutan? Leave a hope on the tree, or share an idea for making it happen.</p>
        <VisitorPaths/>
      </div>
      <div className="home-tree hero-tree-frame">
        <TreeCanvas leaves={tree.leaves} settings={tree.settings} contributionCount={tree.total} className="hero-tree-canvas" showControls={false} environment="garden" composition="portrait"/>
        <div className="hero-tree-atmosphere" aria-hidden="true"/>
        <span className="hero-tree-hint" aria-hidden="true"><Move3D size={12}/> Drag to orbit · Scroll to zoom</span>
        <Link href="/display" className="hero-tree-link">See the tree up close <ArrowUpRight size={13} aria-hidden="true"/></Link>
      </div>
    </div></section>
    <div className="home-marquee" aria-hidden="true"><div className="home-marquee-track">{[0,1].map(group => <div className="home-marquee-group" key={group}>{places.map(place => <span className="home-marquee-item" key={place}>{place}<Leaf className="home-marquee-leaf" size={22} strokeWidth={1.4}/></span>)}</div>)}</div></div>
    <section className="home-section canopy-section" aria-labelledby="canopy-title">
      <div className="home-heading-row"><div><p className="home-eyebrow">From the canopy</p><h2 className="home-h2" id="canopy-title">Hopes that have already taken root.</h2></div><Link href="/discover" className="home-text-link">Read the grove <ArrowUpRight size={14} aria-hidden="true"/></Link></div>
      {!ready && connection !== "reconnecting" ? <div className="canopy-grid" aria-busy="true" aria-label="Loading recent hopes">{[0,1,2].map(n => <Skeleton className="canopy-skeleton" key={n}/>)}</div>
      : publicLeaves.length ? <ul className="canopy-grid">{publicLeaves.map(leaf => <li key={leaf.id}><Link href={`/leaf/${leaf.id}`} className="canopy-card" style={{"--tone":themeFor(leaf.category).color} as CSSProperties}>
        <span className="canopy-theme"><ThemeIcon theme={leaf.category} size={14}/>{themeFor(leaf.category).short}</span><blockquote>“{leaf.leaf_message}”</blockquote><span className="canopy-meta">Read this leaf</span><span className="canopy-arrow" aria-hidden="true"><ArrowUpRight size={15}/></span>
      </Link></li>)}</ul>
      : <div className="canopy-empty"><div className="canopy-empty-copy">{!ready || tree.statsUnavailable ? <><h3>The canopy is reconnecting.</h3><p>You can still browse the community while the tree catches up.</p><Link className="home-text-link" href="/discover">Browse community ideas</Link></> : <><h3>The canopy is young.</h3><p>No public hopes are on display yet. What would you like the first leaf to say?</p><Link className="hero-cta hero-cta-primary" href="/join">Add the first hope <ArrowUpRight size={16} aria-hidden="true"/></Link></>}</div><figure className="canopy-sample"><figcaption className="canopy-sample-badge">Example, not a submission</figcaption><blockquote>“I hope Bhutan’s forests and green spaces keep thriving for generations.”</blockquote></figure></div>}
    </section>
    <ThemeBranches/>
  </div>;
}

export function HomeClosing() {
  return <section className="home-closing"><div className="closing-card">
    <Sprout className="closing-sprout" size={460} strokeWidth={0.5} aria-hidden="true"/>
    <p className="home-eyebrow">Your turn</p><h2>One leaf. One hope. One Bhutan.</h2>
    <p className="closing-copy">Think of a place, a person, or a tradition you want to see thrive. Start there.</p>
    <div className="closing-actions"><Link className="closing-primary" href="/join">Add your hope <ArrowUpRight size={17} aria-hidden="true"/></Link><Link className="closing-secondary" href="/discover">Read the community <ArrowRight size={16} aria-hidden="true"/></Link></div>
  </div></section>;
}
