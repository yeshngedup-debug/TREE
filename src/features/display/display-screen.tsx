"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Maximize,
  Minimize,
  ArrowUpRight,
  Sprout,
  X,
  Wind,
  Play,
  Pause,
  Plus,
  Minus,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { TreeCanvas } from "./tree-canvas";
import { themeFor, type Leaf } from "@/lib/catalog";
import { useTree } from "@/hooks/use-tree";
import { appUrl } from "@/lib/client";
import { displayMessage } from "@/lib/display-copy";
import { defaultTreeSettings, treePalettes } from "@/lib/tree-settings";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import type { SceneController } from "./tree-scene";
import {
  armChime,
  playChime,
  rememberSound,
  soundAllowed,
} from "./chime";

type Notice = { count: number; leaf: Leaf };

export function DisplayScreen() {
  const { tree, connection, ready } = useTree({ cache: true });
  const scene = useRef<SceneController | null>(null);
  const [rotating, setRotating] = useState(true);
  const [arrivalIds, setArrivalIds] = useState<string[]>([]);
  const settings = tree?.settings || defaultTreeSettings;
  const presentation = useMemo(
    () => ({ ...settings, autoRotate: rotating }),
    [settings, rotating],
  );
  const [leaves, setLeaves] = useState<Leaf[]>([]),
    [featured, setFeatured] = useState<Leaf | null>(null),
    [selected, setSelected] = useState<Leaf | null>(null);
  const [joinUrl, setJoinUrl] = useState(""),
    [full, setFull] = useState(false),
    [pending, setPending] = useState(0),
    [lastArrival, setLastArrival] = useState(0),
    [showReflection, setShowReflection] = useState(false),
    [reflectionVisible, setReflectionVisible] = useState(false),
    [sound, setSound] = useState(true),
    [notice, setNotice] = useState<Notice | null>(null);
  const initialized = useRef(false),
    synced = useRef(false),
    seen = useRef(new Set<string>()),
    queue = useRef<Leaf[]>([]),
    available = useRef(new Set<string>()),
    flights = useRef(new Map<string, number>()),
    stories = useRef<Leaf[]>([]),
    lastStory = useRef(0),
    noticeRef = useRef<Notice | null>(null),
    soundRef = useRef(true);
  useEffect(() => {
    setTimeout(() => setJoinUrl(appUrl() + "/join"), 0);
    const changed = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    const stored = setTimeout(() => setSound(soundAllowed()), 0);
    // Browsers keep audio locked until someone touches the kiosk. Arm the
    // context on the first tap or key press so the next arrival can ring.
    const arm = () => armChime();
    window.addEventListener("pointerdown", arm, { once: true, capture: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      clearTimeout(stored);
      window.removeEventListener("pointerdown", arm, { capture: true });
      window.removeEventListener("keydown", arm);
    };
  }, []);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      noticeRef.current = null;
      setNotice(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    // Wait for a real snapshot before priming. The hook mounts with an empty
    // placeholder tree, and treating that placeholder as the baseline makes
    // every existing leaf look like a fresh arrival on reload.
    if (!ready || !tree) return;
    available.current = new Set(tree.leaves.map((leaf) => leaf.id));
    if (!initialized.current || (!synced.current && connection === "live")) {
      initialized.current = true;
      if (connection === "live") synced.current = true;
      seen.current.clear();
      queue.current = [];
      flights.current.clear();
      stories.current = [];
      setArrivalIds([]);
      setPending(0);
      tree.leaves.forEach((leaf) => seen.current.add(leaf.id));
      setLeaves(tree.leaves);
      setFeatured(tree.leaves[0] || null);
      return;
    }
    // Removed leaves can later be restored by staff. Forget their seen IDs so
    // that restoration becomes an arrival again, without requiring a reload.
    for (const id of seen.current) {
      if (!available.current.has(id)) seen.current.delete(id);
    }
    const incoming = tree.leaves
      .filter((leaf) => !seen.current.has(leaf.id))
      .reverse();
    incoming.forEach((leaf) => seen.current.add(leaf.id));
    queue.current = [
      ...queue.current.filter((leaf) => available.current.has(leaf.id)),
      ...incoming,
    ].slice(-120);
    setPending(queue.current.length);
    for (const id of flights.current.keys())
      if (!available.current.has(id)) flights.current.delete(id);
    setArrivalIds((previous) =>
      previous.filter((id) => available.current.has(id)),
    );
    setLeaves((previous) =>
      previous.filter((leaf) => available.current.has(leaf.id)),
    );
    setSelected((previous) =>
      previous && !available.current.has(previous.id) ? null : previous,
    );
    setFeatured((previous) =>
      previous && !available.current.has(previous.id) ? null : previous,
    );
  }, [tree, connection, ready]);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [id, expires] of flights.current)
        if (expires <= now || !available.current.has(id))
          flights.current.delete(id);
      const size = Math.min(
        8,
        Math.max(1, Math.ceil(queue.current.length / 4)),
      );
      const batch = queue.current
        .splice(0, size)
        .filter((leaf) => available.current.has(leaf.id));
      if (batch.length) {
        setPending(queue.current.length);
        const ids = new Set(batch.map((leaf) => leaf.id));
        setLeaves((previous) =>
          [
            ...batch.reverse(),
            ...previous.filter((leaf) => !ids.has(leaf.id)),
          ].slice(0, 120),
        );
        batch.forEach((leaf, index) =>
          flights.current.set(leaf.id, now + 2600 + index * 80),
        );
        stories.current = [...stories.current, ...batch].slice(-12);
        setLastArrival(now);
        setShowReflection(false);
        // Keep one paper slip on screen while a burst of leaves lands; a new
        // batch inside the dismissal window adds to it rather than restacking.
        const previous = noticeRef.current;
        const next = {
          count: (previous?.count ?? 0) + batch.length,
          leaf: batch[batch.length - 1],
        };
        noticeRef.current = next;
        setNotice(next);
        if (soundRef.current) playChime();
      }
      const ids = [...flights.current.keys()];
      setArrivalIds((previous) =>
        previous.length === ids.length &&
        previous.every((id, i) => id === ids[i])
          ? previous
          : ids,
      );
      if (now - lastStory.current >= 4500) {
        let next = stories.current.shift();
        while (next && !available.current.has(next.id))
          next = stories.current.shift();
        if (next) {
          setFeatured(next);
          lastStory.current = now;
        }
      }
    }, 350);
    const reflectionTimer = setInterval(
      () => setShowReflection((value) => !value),
      18000,
    );
    return () => {
      clearInterval(interval);
      clearInterval(reflectionTimer);
    };
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      setReflectionVisible(
        Boolean(
          showReflection && tree?.reflection && !selected && Date.now() - lastArrival > 6500,
        ),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [showReflection, tree?.reflection, selected, lastArrival]);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Some embedded browsers do not support fullscreen. */
    }
  }
  function toggleSound() {
    setSound((value) => {
      const next = !value;
      rememberSound(next);
      return next;
    });
  }
  const active = selected || featured,
    reflection =
      showReflection &&
      tree?.reflection &&
      !selected &&
      reflectionVisible;
  const palette = treePalettes[settings.palette];
  const contentKey = reflection
    ? `reflection-${tree?.reflection?.body}`
    : active?.id || "first-hope";
  const headlineWords = settings.headline.trim().split(/\s+/).filter(Boolean);
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="kiosk-shell"
        data-testid="kiosk-display"
        data-palette={settings.palette}
        data-sound={sound ? "on" : "off"}
        style={
          {
            background: `linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 34%, rgba(8,16,12,0.1) 100%), ${palette.background}`,
            "--tree-surface": palette.background,
            color:
              settings.palette === "night"
                ? "#f5f8ee"
                : settings.palette === "frost"
                  ? "#071d2e"
                  : "#243c3a",
          } as React.CSSProperties
        }
      >
        <TreeCanvas
          leaves={leaves}
          contributionCount={Math.max(0, (tree?.total || 0) - pending)}
          settings={presentation}
          activeId={active?.id}
          arrivalIds={arrivalIds}
          onSelect={setSelected}
          className="kiosk-tree"
          environment="garden"
          composition="poster"
          followArrival
          sceneRef={scene}
          showControls={false}
        />
        <div className="kiosk-halo" aria-hidden="true" />
        <div className="kiosk-grain" aria-hidden="true" />
        <main className="kiosk-screen">
          <motion.header
            className="kiosk-header"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Link
              href="/"
              className="kiosk-brand"
              aria-label="The living tree, Bhutan"
            >
              <Sprout strokeWidth={1.4} aria-hidden="true" />
              <span className="kiosk-brand-name">
                The living tree
                <span className="kiosk-brand-subtitle">Bhutan</span>
              </span>
            </Link>
            <div className="kiosk-header-actions">
              <Link
                href="/tree"
                className="kiosk-icon"
                aria-label="Open interactive Tree Studio"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
              </Link>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleFullscreen}
                className="kiosk-icon"
                aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {full ? (
                  <Minimize size={16} aria-hidden="true" />
                ) : (
                  <Maximize size={16} aria-hidden="true" />
                )}
              </motion.button>
            </div>
          </motion.header>
          <motion.div
            className="kiosk-heading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
          >
            <h1 aria-label={settings.headline}>
              {headlineWords.map((word, index) => (
                <span key={word + index} className="kiosk-h1-word" aria-hidden="true">
                  <motion.span
                    initial={{ y: "112%" }}
                    animate={{ y: "0%" }}
                    transition={{
                      delay: 0.25 + index * 0.06,
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {word}
                    {index < headlineWords.length - 1 ? "\u00A0" : ""}
                  </motion.span>
                </span>
              ))}
            </h1>
          </motion.div>
          <motion.p
            className="kiosk-caption"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <span className="kiosk-caption-count" aria-busy={!ready}>
              {ready ? (
                <>
                  <motion.strong
                    key={lastArrival}
                    initial={{ scale: 1.2, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  >
                    {tree?.total ?? 0}
                  </motion.strong>
                  <span>
                    {tree?.total === 1 ? "hope" : "hopes"} taking root
                  </span>
                </>
              ) : (
                <span className="kiosk-caption-loading">
                  <span className="kiosk-caption-pulse" aria-hidden="true" />
                  Counting the canopy
                </span>
              )}
            </span>
            <span className="kiosk-caption-divider" aria-hidden="true">
              ·
            </span>
            <span className="kiosk-connection" aria-live="polite">
              <span
                aria-hidden="true"
                className={`kiosk-connection-dot ${
                  connection === "live" ? "bg-[#55834d]" : "bg-amber-500"
                }`}
              />
              <span className="kiosk-connection-label">
                {connection === "live"
                  ? "A living collection"
                  : connection === "connecting"
                    ? "Connecting"
                    : "Reconnecting"}
              </span>
            </span>
          </motion.p>
          <AnimatePresence>
            {notice && (
              <motion.aside
                className="kiosk-notice"
                aria-hidden="true"
                initial={{ opacity: 0, y: -14, rotate: -1.2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.28 },
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="kiosk-notice-label">
                  <motion.strong
                    key={notice.count}
                    initial={{ scale: 1.35, opacity: 0.35 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 16,
                    }}
                  >
                    {notice.count}
                  </motion.strong>
                  <span>
                    {notice.count === 1
                      ? "new hope just arrived"
                      : "new hopes just arrived"}
                  </span>
                </p>
                <p className="kiosk-notice-quote">
                  “{displayMessage(notice.leaf.leaf_message, 108)}”
                </p>
                <span className="kiosk-notice-meta">
                  Leaf #{notice.leaf.id.slice(0, 6)} ·{" "}
                  {themeFor(notice.leaf.category).short}
                </span>
              </motion.aside>
            )}
          </AnimatePresence>
          <div className="kiosk-stage" aria-hidden="true" />
          <div className="kiosk-bottom">
            <section
              className="kiosk-feature"
              aria-label="A hope from the tree"
              aria-live="polite"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={contentKey}
                  initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    y: -10,
                    filter: "blur(3px)",
                    transition: { duration: 0.18 },
                  }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="kiosk-feature-label">
                    {reflection
                      ? "A reflection from our branches"
                      : active?.is_demo
                        ? "Illustrative demo leaf"
                        : selected
                          ? themeFor(selected.category).label
                          : active
                            ? "A hope taking root"
                            : "A little possibility"}
                  </p>
                  <blockquote>
                    {reflection
                      ? displayMessage(tree!.reflection!.body)
                      : active
                        ? `“${displayMessage(active.leaf_message, 100)}”`
                        : "Every future begins with a hope."}
                  </blockquote>
                  <div className="kiosk-feature-meta">
                    <span className="kiosk-leaf-code">
                      {active && !reflection
                        ? `Leaf #${active.id.slice(0, 6)} · ${themeFor(active.category).short}`
                        : "Scan to grow a new leaf."}
                    </span>
                    {active?.post_slug && !reflection ? (
                      <Link
                        href={`/posts/${active.post_slug}`}
                        className="kiosk-post-link"
                      >
                        Read the post{" "}
                        <ArrowUpRight size={12} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </motion.div>
              </AnimatePresence>
              {selected && (
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setSelected(null)}
                  className="kiosk-close"
                  aria-label="Close selected leaf"
                >
                  <X size={14} aria-hidden="true" />
                </motion.button>
              )}
            </section>
            <div className="kiosk-controls" aria-label="Tree controls">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Send a breeze through the tree"
                onClick={() => scene.current?.breeze()}
              >
                <Wind size={17} aria-hidden="true" />
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                aria-label={
                  rotating ? "Pause tree rotation" : "Resume tree rotation"
                }
                aria-pressed={!rotating}
                onClick={() => setRotating((value) => !value)}
              >
                {rotating ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="kiosk-zoom"
                aria-label="Zoom in on tree"
                onClick={() => scene.current?.zoom(0.85)}
              >
                <Plus size={18} aria-hidden="true" />
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="kiosk-zoom"
                aria-label="Zoom out of tree"
                onClick={() => scene.current?.zoom(1.15)}
              >
                <Minus size={18} aria-hidden="true" />
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Reset tree view"
                onClick={() => scene.current?.resetView()}
              >
                <RotateCcw size={16} aria-hidden="true" />
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="kiosk-sound"
                aria-label={
                  sound ? "Mute arrival sound" : "Enable arrival sound"
                }
                onClick={toggleSound}
              >
                {sound ? (
                  <Volume2 size={17} aria-hidden="true" />
                ) : (
                  <VolumeX size={17} aria-hidden="true" />
                )}
              </motion.button>
            </div>
            <motion.section
              className="kiosk-qr-panel"
              aria-label="Add your hope"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
            >
              <div className="kiosk-qr-copy">
                <p className="kiosk-qr-label">
                  {settings.acceptingContributions
                    ? "Scan to add your hope"
                    : "The tree is resting"}
                </p>
                <span className="kiosk-qr-url">
                  {settings.acceptingContributions
                    ? joinUrl.replace(/^https?:\/\//, "")
                    : "Come back shortly"}
                </span>
                {connection !== "live" ? (
                  <span className="kiosk-qr-status">
                    Connection paused · the tree will catch up
                  </span>
                ) : null}
              </div>
              {joinUrl ? (
                <Link
                  href="/join"
                  className="kiosk-qr"
                  aria-label="Scan with your phone to add your hope"
                >
                  <QRCodeSVG
                    value={joinUrl}
                    size={420}
                    marginSize={3}
                    fgColor="#171b12"
                    bgColor="#ffffff"
                    title="Scan to add your hope"
                  />
                </Link>
              ) : (
                <div className="kiosk-qr kiosk-qr-pending" role="status">
                  <span className="sr-only">Preparing the scan link</span>
                </div>
              )}
            </motion.section>
          </div>
          <p role="status" className="sr-only">
            {notice
              ? `${notice.count === 1 ? "A new hope just arrived" : `${notice.count} new hopes just arrived`}: ${displayMessage(notice.leaf.leaf_message, 108)}`
              : connection === "reconnecting"
                ? "Connection paused. Keeping the tree while we reconnect."
                : pending
                  ? `${pending} ${pending === 1 ? "leaf is" : "leaves are"} finding a branch…`
                  : "Anonymous voices. Shared possibilities."}
            {Boolean(tree?.stats.demo) &&
              ` Includes ${tree!.stats.demo} illustrative demo leaves.`}
          </p>
        </main>
      </div>
    </MotionConfig>
  );
}
