import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Sprout } from "lucide-react";

/**
 * Shared editorial frame for the community, visitor and staff surfaces.
 * Keeps the home / discover / explore language in one place without
 * redefining the global tokens used by the display kiosk.
 */
export function SurfaceShell({
  children,
  className = "",
  tool = false,
}: {
  children: ReactNode;
  className?: string;
  tool?: boolean;
}) {
  return (
    <div
      className={`surface-shell${tool ? " surface-tool" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
}

export function SurfaceHero({
  kicker,
  title,
  lede,
  children,
  aside,
  compact = false,
}: {
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header className={`surface-hero${compact ? " is-compact" : ""}`}>
      <div className="surface-hero-copy">
        <p className="surface-kicker">{kicker}</p>
        <h1 className="surface-title">{title}</h1>
        {lede ? <p className="surface-lede">{lede}</p> : null}
        {children ? <div className="surface-actions">{children}</div> : null}
      </div>
      {aside ? <div className="surface-hero-aside">{aside}</div> : null}
    </header>
  );
}

export function SurfaceClosing({
  kicker = "Keep growing",
  title,
  text,
  primary,
  secondary,
}: {
  kicker?: string;
  title: ReactNode;
  text?: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="surface-closing" aria-label={kicker}>
      <Sprout
        className="surface-closing-mark"
        size={280}
        strokeWidth={0.45}
        aria-hidden="true"
      />
      <div className="surface-closing-copy">
        <p className="surface-kicker">{kicker}</p>
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
        <div className="surface-closing-actions">
          <Link href={primary.href} className="surface-closing-primary">
            {primary.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          {secondary ? (
            <Link href={secondary.href} className="surface-closing-secondary">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
