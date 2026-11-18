"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { VisitorAccess, type VisitHistory } from "./visitor-access";
export function VisitorVoices() {
  const [history, setHistory] = useState<VisitHistory | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [confirmForget, setConfirmForget] = useState(false);
  const load = useCallback(() => {
    void api<VisitHistory>(`/api/visitor?page=${page}`, { cache: "no-store" })
      .then(setHistory)
      .catch((err) => setError(err.message));
  }, [page]);
  useEffect(load, [load]);
  async function leave(forget = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/visitor${forget ? "?forget=true" : ""}`, {
        method: "DELETE",
      });
      try {
        sessionStorage.removeItem("bi-tree-hope-conversation");
        sessionStorage.removeItem("bi-tree-hope-receipt");
        sessionStorage.removeItem("bi-tree-hope-draft");
      } catch {
        /* Storage can be disabled. */
      }
      setHistory(null);
      setPage(1);
      // setPage(1) only re-triggers the load effect when the page was not
      // already 1, so reload explicitly to reveal the locked state.
      load();
      setConfirmForget(false);
      // load() reads the current page closure; the unauthenticated response
      // does not depend on the page number.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="surface-kicker">Your visit</p>
        <h1 className="text-3xl tracking-tight">Your previous voices</h1>
        <p className="mt-2 text-sm leading-6 text-soft">
          A private place for the hopes you’ve shared and the replies you
          received.
        </p>
        <p className="mt-2 text-xs leading-5 text-soft">
          Enter the 11-digit CID and 6-digit PIN you chose when you planted.
          Staff cannot recover a forgotten CID or PIN — your keepsake link
          (shown when you planted) is the only other way back to a leaf.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      {!history ? (
        <p role="status" className="text-xs">Opening your visit history…</p>
      ) : !history.authenticated ? (
        <VisitorAccess onUnlocked={load} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-soft">
              {history.total} saved {history.total === 1 ? "voice" : "voices"}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void leave()}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              Sign out
            </Button>
          </div>
          {!history.voices.length && (
            <p className="rounded-2xl bg-muted p-5 text-sm">
              Your next submitted voice will appear here while you’re signed in.
            </p>
          )}
          {history.voices.map((voice) => (
            <article key={voice.id} className="rounded-2xl bg-card p-5 sm:p-6">
              <p className="text-xs text-soft">
                {new Date(voice.created_at).toLocaleDateString("en-GB", {
                  timeZone: "Asia/Thimphu",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · Guide path {voice.chamber_id}
              </p>
              <h2 className="mt-3 text-sm font-medium">Your note</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {voice.note || "The original note is no longer available."}
              </p>
              {voice.reply && (
                <div className="mt-4 rounded-xl bg-muted p-4">
                  <h3 className="text-sm font-medium">Your reply</h3>
                  <p className="mt-2 text-sm leading-6">{voice.reply}</p>
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-soft">
                Your leaf: “{voice.leaf_message}”
              </p>
              {voice.status === "approved" ? (
                <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Link
                    href={`/leaf/${voice.id}`}
                    className="inline-flex min-h-10 items-center text-sm underline underline-offset-4"
                  >
                    Open public keepsake
                  </Link>
                  <Link
                    href={`/display?leaf=${voice.id}`}
                    className="inline-flex min-h-10 items-center text-sm underline underline-offset-4"
                  >
                    See it on the shared tree
                  </Link>
                </span>
              ) : (
                <p className="mt-3 text-xs text-soft">
                  This leaf is no longer on the public tree.
                </p>
              )}
            </article>
          ))}
          {history.pages > 1 && (
            <nav
              className="flex items-center justify-between gap-2"
              aria-label="History pages"
            >
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-sm text-soft shrink-0">
                {page} / {history.pages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= history.pages}
                onClick={() => setPage((value) => value + 1)}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            </nav>
          )}
          <details className="rounded-xl bg-muted p-4">
            <summary className="cursor-pointer text-sm">
              Manage my visit profile
            </summary>
            <p className="mt-3 text-sm leading-6 text-soft">
              Removing your profile deletes its CID lookup, PIN and history
              links and signs out every device. Anonymous leaves and staff
              submission records remain. This action cannot be undone.
            </p>
            {confirmForget ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void leave(true)} className="w-full sm:w-auto">
                  Remove my visit profile
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmForget(false)}
                  className="w-full sm:w-auto"
                >
                  Keep my profile
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="mt-3 w-full sm:w-auto"
                onClick={() => setConfirmForget(true)}
              >
                Remove profile…
              </Button>
            )}
          </details>
          <Button asChild className="mt-6 w-full">
            <Link href="/join">Add a new hope</Link>
          </Button>
        </>
      )}
    </div>
  );
}
