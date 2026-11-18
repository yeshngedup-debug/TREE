"use client";
import { useEffect, useState } from "react";
import type { TreeSnapshot } from "@/lib/catalog";
import { themes, type Theme, type Leaf } from "@/lib/catalog";
import { fetchWithTimeout } from "@/lib/client";
import { defaultTreeSettings } from "@/lib/tree-settings";
export function useTree({ cache = false }: { cache?: boolean } = {}) {
  const [tree, setTree] = useState<TreeSnapshot>(() => ({
    leaves: [],
    total: 0,
    stats: {
      total: 0,
      today: 0,
      demo: 0,
      categories: Object.fromEntries(
        themes.map((t) => [t.id, 0]),
      ) as Record<Theme, number>,
    },
    reflection: null,
    revision: 0,
    serverTime: new Date().toISOString(),
    settings: defaultTreeSettings,
  })),
    [connection, setConnection] = useState<
      "connecting" | "live" | "reconnecting"
    >("connecting"),
    // `ready` only flips once a snapshot has actually arrived (live or cached).
    // Surfaces wait for it so they never render "0 hopes" or an empty-state CTA
    // while the first request is still in flight.
    [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    let busy = false;
    function accept(data: TreeSnapshot) {
      if (!alive) return;
      const safeData: TreeSnapshot = {
        ...data,
        stats: {
          total: data.stats?.total ?? 0,
          today: data.stats?.today ?? 0,
          demo: data.stats?.demo ?? 0,
          categories: (data.stats?.categories ??
            Object.fromEntries(themes.map((t) => [t.id, 0]))) as Record<
            Theme,
            number
          >,
        },
      };
      setTree((previous) =>
        !previous ||
        Date.parse(data.serverTime) >= Date.parse(previous.serverTime)
          ? safeData
          : previous,
      );
      setConnection(navigator.onLine ? "live" : "reconnecting");
      setReady(true);
      if (cache)
        try {
          localStorage.setItem("bi-tree-cache", JSON.stringify(data));
        } catch {
          /* optional cache */
        }
    }
    if (cache)
      try {
        const stored = JSON.parse(
          localStorage.getItem("bi-tree-cache") || "null",
        );
        if (
          stored &&
          Array.isArray(stored.leaves) &&
          Date.now() - Date.parse(stored.serverTime) < 86400000
        )
          setTimeout(() => {
            setTree(stored);
            setReady(true);
          }, 0);
      } catch {
        /* optional cache */
      }
    async function reconcile() {
      if (busy) return;
      busy = true;
      try {
        const response = await fetchWithTimeout(
          "/api/leaves",
          {
            cache: "no-store",
            signal: controller.signal,
          },
          10000,
        );
        if (!response.ok) throw new Error();
        accept(await response.json());
      } catch {
        if (alive) setConnection("reconnecting");
      } finally {
        busy = false;
      }
    }
    const stream =
      typeof window.EventSource === "function"
        ? new EventSource("/api/tree/stream")
        : null;
    stream?.addEventListener("tree", (event) => {
      try {
        accept(JSON.parse((event as MessageEvent).data));
      } catch {
        void reconcile();
      }
    });
    if (stream)
      stream.onerror = () => {
        if (alive) setConnection("reconnecting");
        // EventSource retries the stream on its own, but don't wait up to a
        // poll interval: pull a snapshot now so the display catches up
        // quickly. reconcile() is guarded against overlapping fetches.
        void reconcile();
      };
    void reconcile();
    const interval = setInterval(reconcile, stream ? 15000 : 2000);
    window.addEventListener("online", reconcile);
    const offline = () => setConnection("reconnecting");
    window.addEventListener("offline", offline);
    return () => {
      alive = false;
      controller.abort();
      stream?.close();
      clearInterval(interval);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("offline", offline);
    };
  }, [cache]);
  return { tree, connection, ready };
}
