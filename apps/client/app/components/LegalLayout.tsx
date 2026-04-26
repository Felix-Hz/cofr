import type { ReactNode } from "react";
import { Link } from "react-router";
import ThemeToggle from "~/components/ThemeToggle";

interface TocItem {
  id: string;
  label: string;
}

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  tldr: string[];
  toc: TocItem[];
  children: ReactNode;
}

function CofrBrand() {
  return <span className="cofr-brand">cofr</span>;
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  tldr,
  toc,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-surface-page/95 backdrop-blur-md border-edge-default">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="text-[20px]" style={{ color: "var(--content-heading)" }}>
            <CofrBrand />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 px-4 text-[13px] font-medium transition-colors text-content-secondary hover:text-content-primary"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header
        className="border-b px-5 py-14 sm:px-6 sm:py-20"
        style={{
          background: "var(--surface-primary)",
          borderColor: "var(--edge-default)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--accent)" }}
          >
            Legal
          </p>
          <h1
            className="mb-3 text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.5rem]"
            style={{ color: "var(--content-heading)" }}
          >
            {title}
          </h1>
          <p className="mb-6 text-[15px]" style={{ color: "var(--content-tertiary)" }}>
            {subtitle}. Last updated <time>{lastUpdated}</time>
          </p>

          {/* TL;DR */}
          <div
            className="max-w-2xl rounded-xl border p-5"
            style={{
              background: "var(--accent-soft-bg)",
              borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
            }}
          >
            <p
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--accent-soft-text)" }}
            >
              TL;DR: Plain English Summary
            </p>
            <ul className="space-y-2">
              {tldr.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-[13px] leading-relaxed"
                  style={{ color: "var(--content-secondary)" }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: "var(--accent)" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="flex gap-16">
          {/* Sticky TOC */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">
              <p
                className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--accent)" }}
              >
                Contents
              </p>
              <nav className="space-y-0.5">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded py-1.5 px-2 text-[13px] transition-colors"
                    style={{ color: "var(--content-tertiary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--accent)";
                      e.currentTarget.style.background = "var(--accent-soft-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--content-tertiary)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>

      {/* Footer bar */}
      <div className="border-t px-5 py-6 sm:px-6" style={{ borderColor: "var(--edge-default)" }}>
        <div
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 text-[13px]"
          style={{ color: "var(--content-tertiary)" }}
        >
          <span>
            &copy; {new Date().getFullYear()} <CofrBrand />. All rights reserved.
          </span>
          <div className="flex gap-5">
            <Link
              to="/terms"
              className="transition-colors hover:text-accent"
              style={{ color: "var(--content-tertiary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--content-tertiary)";
              }}
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="transition-colors"
              style={{ color: "var(--content-tertiary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--content-tertiary)";
              }}
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, number, title, children }: SectionProps) {
  return (
    <section
      id={id}
      className="mb-12 scroll-mt-24 border-b pb-12 last:border-b-0 last:pb-0"
      style={{ borderColor: "var(--edge-default)" }}
    >
      <p
        className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--accent)" }}
      >
        {number}
      </p>
      <h2
        className="mb-4 text-[1.25rem] font-bold tracking-[-0.02em]"
        style={{ color: "var(--content-heading)" }}
      >
        {title}
      </h2>
      <div
        className="space-y-3 text-[14px] leading-relaxed"
        style={{ color: "var(--content-secondary)" }}
      >
        {children}
      </div>
    </section>
  );
}

export function LegalTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border"
      style={{ borderColor: "var(--edge-default)" }}
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr
            style={{
              background: "var(--surface-elevated)",
              borderBottom: `1px solid var(--edge-default)`,
            }}
          >
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left font-semibold"
                style={{ color: "var(--content-heading)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row[0]}
              style={{
                background:
                  i % 2 === 0
                    ? "transparent"
                    : "color-mix(in srgb, var(--surface-elevated) 40%, transparent)",
                borderTop:
                  i > 0
                    ? `1px solid color-mix(in srgb, var(--edge-default) 50%, transparent)`
                    : "none",
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={`${row[0]}-${j}`}
                  className="px-4 py-2.5 align-top"
                  style={{ color: j === 0 ? "var(--content-heading)" : "var(--content-secondary)" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
