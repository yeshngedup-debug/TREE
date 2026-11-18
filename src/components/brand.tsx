"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  LogIn,
  LogOut,
  ShieldCheck,
  Sprout,
  UserRound,
} from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="BI Tree home"
      className="inline-flex items-center gap-2 sm:gap-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-accent sm:h-10 sm:w-10">
        <Sprout size={22} strokeWidth={1.6} />
      </span>
      <span>
        <span className="block whitespace-nowrap text-[15px] font-semibold leading-none tracking-tight sm:text-xl">
          BI Tree
        </span>
        {!compact && (
          <span className="site-header-brand-sub mt-1.5 block whitespace-nowrap text-xs tracking-[.14em] opacity-70">
            Bhutanese Idea Tree
          </span>
        )}
      </span>
    </Link>
  );
}
export function SiteHeader() {
  const pathname = usePathname();
  const items = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
    },
    {
      href: "/discover",
      label: "Discover",
      active:
        pathname.startsWith("/discover") ||
        pathname.startsWith("/posts") ||
        pathname.startsWith("/u/"),
    },
    {
      href: "/explore",
      label: "Explore Bhutan",
      active: pathname.startsWith("/explore"),
    },
    {
      href: "/display",
      label: "Live tree",
      active: pathname.startsWith("/display"),
    },
    {
      href: "/guidelines",
      label: "Guidelines",
      active: pathname.startsWith("/guidelines"),
    },
  ];
  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Brand />
        <nav aria-label="Main navigation" className="site-header-nav">
          {items.map(({ href, label, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={href === "/explore" ? "Explore Bhutan" : undefined}
              className="site-header-link"
            >
              {href === "/explore" ? (
                <>
                  <span className="site-header-label-full">{label}</span>
                  <span className="site-header-label-short" aria-hidden="true">
                    Explore
                  </span>
                </>
              ) : (
                label
              )}
              {href === "/display" && (
                <ArrowUpRight size={13} aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions">
          <Link
            href="/create"
            aria-label="Share an idea"
            className="site-header-share"
          >
            <span>Share an idea</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
type SessionAccount = {
  username: string;
  displayName: string;
  avatarUrl: string;
  role: "member" | "moderator" | "admin";
};

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Compact account entry point. Keeps Saved, the public profile and moderation
 * one tap away without turning the header into a second navigation bar.
 */
function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/community/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { account?: SessionAccount | null } | null) => {
        if (active) setAccount(payload?.account ?? null);
      })
      .catch(() => {
        if (active) setAccount(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // A details element stays open across client navigation; close it whenever
  // the route changes so the menu never floats over the next page.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/community/auth/logout", { method: "POST" });
      setAccount(null);
      if (menu.current) menu.current.open = false;
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ready)
    return (
      <span
        aria-hidden="true"
        className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-foreground/10"
      />
    );

  if (!account)
    return (
      <Link
        href="/create?mode=login"
        aria-label="Sign in to BI Tree"
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foreground/[0.05] px-3 text-xs font-medium sm:px-4"
      >
        <LogIn size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );

  return (
    <details
      ref={menu}
      className="relative shrink-0"
    >
      <summary
        aria-label={`Account menu for ${account.displayName}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && menu.current?.open) {
            menu.current.open = false;
            menu.current.querySelector("summary")?.focus();
          }
        }}
        className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full bg-foreground/[0.05] py-1 pl-1 pr-2 [&::-webkit-details-marker]:hidden"
      >
        {account.avatarUrl ? (
          <img
            src={account.avatarUrl}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {initialsOf(account.displayName)}
          </span>
        )}
        <span className="hidden max-w-24 truncate text-xs font-medium xl:inline">
          {account.displayName}
        </span>
        <ChevronDown size={13} aria-hidden="true" className="opacity-60" />
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl bg-card p-2 shadow-xl">
        <div className="px-3 py-2">
          <p className="truncate text-xs font-semibold">{account.displayName}</p>
          <p className="truncate text-xs text-soft">
            @{account.username}
            {account.role !== "member" ? ` · ${account.role}` : ""}
          </p>
        </div>
        <nav aria-label="Account" className="mt-1 grid">
          <Link
            href={`/u/${account.username}`}
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs hover:bg-foreground/5"
          >
            <UserRound size={14} aria-hidden="true" /> Your profile
          </Link>
          <Link
            href="/saved"
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs hover:bg-foreground/5"
          >
            <Bookmark size={14} aria-hidden="true" /> Saved posts
          </Link>
          {account.role !== "member" ? (
            <Link
              href="/admin/community"
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs hover:bg-foreground/5"
            >
              <ShieldCheck size={14} aria-hidden="true" /> Moderation
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-left text-xs hover:bg-foreground/5 disabled:opacity-60"
          >
            <LogOut size={14} aria-hidden="true" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </nav>
      </div>
    </details>
  );
}
export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[12px] text-soft md:px-10">
      <span>Rooted in values. Growing through people.</span>
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <Link href="/discover">Discover</Link>
        <Link href="/create">Share an idea</Link>
        <Link href="/saved">Saved posts</Link>
        <Link href="/create?mode=login">Sign in</Link>
        <Link href="/join">Add a hope</Link>
        <Link href="/privacy">Participation & privacy</Link>
        <Link href="/admin">Staff console</Link>
        <span>Bhutanese Idea Tree</span>
      </div>
    </footer>
  );
}
