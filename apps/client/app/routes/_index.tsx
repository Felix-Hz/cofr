import { useEffect, useRef, useState } from "react";
import { Link, redirect } from "react-router";
import ThemeToggle from "~/components/ThemeToggle";
import { isAuthenticated } from "~/lib/auth";
import { IS_LANDING, SUPPORTED_CURRENCIES } from "~/lib/constants";
import "~/landing.css";

const TITLE = "cofr - see where your money goes";
const DESCRIPTION =
  "A simple, open-source money tracker. Log what you spend, import your bank statement, and see where it all went. No ads, no bank logins.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cofr.cash" },
    { property: "og:site_name", content: "cofr" },
    { property: "og:locale", content: "en_US" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:image", content: "https://cofr.cash/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "cofr - Personal finance dashboard" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: "https://cofr.cash/og-image.png" },
    { name: "robots", content: "index, follow" },
    { tagName: "link", rel: "canonical", href: "https://cofr.cash" },
  ];
}

export async function clientLoader() {
  if (!IS_LANDING && isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

const GITHUB_URL = "https://github.com/Felix-Hz/cofr";

// --- FAQ (also feeds the JSON-LD, so the page and the structured data never drift) ---

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Is it free?",
    a: IS_LANDING
      ? "Yes. It's open source (AGPL-3.0) and free to self-host, with every feature."
      : "Yes. No card needed to sign up, and self-hosting is free too.",
  },
  {
    q: "Does it connect to my bank?",
    a: "No. Add transactions yourself or import a CSV statement exported from your bank.",
  },
  {
    q: "What's encrypted?",
    a: "Names, usernames and emails are encrypted at rest; all traffic uses HTTPS. Transactions aren't encrypted, so they can be totalled. Self-host if you want them on your own machine.",
  },
  {
    q: "Which currencies can I use?",
    a: `${SUPPORTED_CURRENCIES.join(", ")}. Totals convert to your currency at rates refreshed daily.`,
  },
  {
    q: "Can I get my data out?",
    a: "Yes: CSV, XLSX, PDF, or a full ZIP.",
  },
  {
    q: "Is there a phone app?",
    a: "It's a web app you install from the browser. It opens full screen like a native app.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. Deactivate it, or delete it permanently along with every transaction.",
  },
];

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "cofr",
      url: "https://cofr.cash",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: "cofr", url: "https://cofr.cash" },
      screenshot: "https://cofr.cash/og-image.png",
      featureList: [
        "Accounts, categories and transfers",
        "Bank statement CSV import",
        "Multi-currency with daily exchange rates",
        "Drag-and-drop dashboard",
        "CSV, XLSX and PDF exports",
        "Self-hostable with Docker",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
});

function JsonLd() {
  const ref = useRef<HTMLScriptElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = JSON_LD;
  }, []);
  return <script ref={ref} type="application/ld+json" />;
}

function CofrBrand({ className = "" }: { className?: string }) {
  return <span className={`cofr-brand ${className}`.trim()}>cofr</span>;
}

// The hosted landing has no accounts, so its calls to action point at the installer instead.
function StartLink({ className, children }: { className: string; children: React.ReactNode }) {
  if (IS_LANDING) {
    return (
      <a href="#self-host" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to="/login?mode=signup" className={className}>
      {children}
    </Link>
  );
}

const BTN_PRIMARY =
  "h-12 px-6 inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white bg-accent hover:bg-accent-hover active:translate-y-px transition-colors";
const BTN_GHOST =
  "h-12 px-6 inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-content-primary border border-edge-strong hover:bg-surface-hover transition-colors";

function GitHubIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// --- Nav ---

function Nav() {
  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-50 bg-surface-page border-b border-edge-default"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" aria-label="cofr home">
          <CofrBrand className="text-[22px] text-content-heading" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="cofr on GitHub"
            className="h-10 w-10 rounded-full flex items-center justify-center text-content-tertiary hover:text-content-primary hover:bg-surface-hover transition-colors"
          >
            <GitHubIcon className="w-[18px] h-[18px]" />
          </a>
          <ThemeToggle />
          {!IS_LANDING && (
            <Link
              to="/login"
              className="hidden sm:inline-flex h-10 px-4 items-center text-[14px] font-semibold text-content-secondary hover:text-content-primary transition-colors"
            >
              Log in
            </Link>
          )}
          <StartLink className="h-10 px-4 sm:px-5 inline-flex items-center rounded-full text-[14px] font-semibold text-white bg-accent hover:bg-accent-hover transition-colors">
            {IS_LANDING ? "Install" : "Sign up"}
          </StartLink>
        </div>
      </div>
    </nav>
  );
}

// --- Hero ---

const RECEIPT_LINES: { label: string; amount: string; circled?: boolean }[] = [
  { label: "Rent", amount: "1,650.00" },
  { label: "Groceries", amount: "412.80" },
  { label: "Flat whites (23)", amount: "126.50", circled: true },
  { label: "Bus & trains", amount: "96.00" },
  { label: "Streaming", amount: "18.99" },
  { label: "Dentist", amount: "180.00" },
  { label: "Takeaways", amount: "143.20" },
];

function Hero() {
  return (
    <section className="px-5 sm:px-6 pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-14 lg:gap-12 items-center">
        <header>
          <h1 className="lp-display lp-in text-content-heading text-[clamp(2.9rem,9vw,5.6rem)]">
            Where did all my <span className="lp-marker lp-marker-anim">money</span> go?
          </h1>
          <p
            className="lp-in mt-6 sm:mt-8 max-w-xl text-[17px] sm:text-[19px] leading-[1.6] text-content-secondary"
            style={{ "--d": 1 } as React.CSSProperties}
          >
            Track spending across accounts and currencies, import your bank statement, and see where
            it went. Open source. No ads, no bank logins.
          </p>
          <div
            className="lp-in mt-9 flex flex-col sm:flex-row gap-3"
            style={{ "--d": 2 } as React.CSSProperties}
          >
            <StartLink className={BTN_PRIMARY}>
              {IS_LANDING ? "Run it yourself" : "Start tracking, free"}
              <span aria-hidden="true">→</span>
            </StartLink>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}>
              <GitHubIcon className="w-4 h-4" />
              Read the code
            </a>
          </div>
          <p
            className="lp-in mt-6 text-[13px] text-content-tertiary"
            style={{ "--d": 3 } as React.CSSProperties}
          >
            Open source · {SUPPORTED_CURRENCIES.length} currencies · Works on your phone
          </p>
        </header>

        <Receipt />
      </div>
    </section>
  );
}

function Receipt() {
  return (
    <div className="relative w-full max-w-[22rem] mx-auto lg:mr-4" aria-hidden="true">
      <div className="lp-receipt-wrap">
        <div className="lp-receipt lp-mono text-[13px] sm:text-[13.5px]">
          <div className="text-center">
            <p className="font-bold tracking-[0.2em] text-[12px]">A NORMAL MONTH</p>
            <p className="opacity-50 text-[11px] mt-1">thanks for shopping, apparently</p>
          </div>
          <div className="my-4 border-t border-dashed border-current opacity-25" />
          <ul className="space-y-2">
            {RECEIPT_LINES.map((line, i) => (
              <li
                key={line.label}
                className="lp-line relative flex items-baseline"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="whitespace-nowrap">{line.label}</span>
                <span className="lp-dots" />
                <span>{line.amount}</span>
                {line.circled && (
                  <>
                    <svg
                      className="absolute -left-3 -right-2 -top-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+1.25rem)] overflow-visible pointer-events-none"
                      viewBox="0 0 200 30"
                      preserveAspectRatio="none"
                    >
                      <path
                        className="lp-pen lp-pen-draw"
                        pathLength={1}
                        d="M118 4 C 60 -2, 6 4, 4 15 C 2 27, 70 29, 140 27 C 190 25, 199 18, 196 10 C 193 3, 160 1, 104 5"
                      />
                    </svg>
                    <span className="lp-note cofr-brand absolute left-[54%] -top-[1.4rem] text-[16px] leading-none">
                      hmm.
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-dashed border-current opacity-25" />
          <ul className="space-y-1.5">
            <li className="lp-line flex" style={{ "--i": 8 } as React.CSSProperties}>
              <span>OUT</span>
              <span className="lp-dots" />
              <span>2,627.49</span>
            </li>
            <li className="lp-line flex" style={{ "--i": 9 } as React.CSSProperties}>
              <span>IN</span>
              <span className="lp-dots" />
              <span>4,230.00</span>
            </li>
            <li
              className="lp-line flex font-bold text-[15px] mt-2"
              style={{ "--i": 10 } as React.CSSProperties}
            >
              <span>KEPT</span>
              <span className="lp-dots" />
              <span className="lp-marker">1,602.51</span>
            </li>
          </ul>
          <p className="mt-5 text-center text-[11px] opacity-50 tracking-[0.3em]">
            ||| | || ||| || | |||
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Ticker ---

const TICKER: { label: string; amount: string; inflow?: boolean }[] = [
  { label: "Flat white", amount: "-5.50" },
  { label: "Salary", amount: "+4,230.00", inflow: true },
  { label: "Bus fare", amount: "-2.40" },
  { label: "Mum paid me back", amount: "+30.00", inflow: true },
  { label: "Parking ticket (ugh)", amount: "-65.00" },
  { label: "Birthday present", amount: "-45.00" },
  { label: "Savings transfer", amount: "500.00" },
  { label: "Gym I never go to", amount: "-19.99" },
  { label: "Sold the old bike", amount: "+120.00", inflow: true },
  { label: "Ramen in Tokyo", amount: "-¥1,200" },
  { label: "Plants (again)", amount: "-38.00" },
];

function Ticker() {
  // Two copies so the loop is seamless; the second is offset by exactly half the track.
  const items = [0, 1].flatMap((copy) => TICKER.map((t) => ({ ...t, key: `${copy}-${t.label}` })));
  return (
    <div className="overflow-hidden py-6" aria-hidden="true">
      <div className="lp-ticker-band py-3.5">
        <div className="lp-ticker-track lp-mono text-[14px]">
          {items.map((t) => (
            <span key={t.key} className="flex items-center gap-2.5 px-5 whitespace-nowrap">
              <span className="opacity-75">{t.label}</span>
              <span className={`font-bold ${t.inflow ? "text-accent" : ""}`}>{t.amount}</span>
              <span className="opacity-30 pl-5">✱</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- What it does ---

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="lp-rise lp-display max-w-2xl mb-10 sm:mb-14 text-content-heading text-[clamp(2.2rem,5.5vw,3.6rem)]">
      {title}
    </h2>
  );
}

function Card({
  title,
  body,
  className = "",
  children,
}: {
  title: string;
  body: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`lp-card lp-rise p-5 sm:p-6 flex flex-col gap-5 ${className}`}>
      <div className="flex-1 min-h-[7.5rem] flex items-center" aria-hidden="true">
        {children}
      </div>
      <div>
        <h3 className="text-[17px] font-bold text-content-heading">{title}</h3>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-content-secondary">{body}</p>
      </div>
    </article>
  );
}

const IMPORT_GROUPS = [
  { name: "Corner Grocer", count: 6, cat: "Groceries", color: "#10b981" },
  { name: "City Bus", count: 9, cat: "Transport", color: "#3b82f6" },
  { name: "Payroll", count: 2, cat: "Income", color: "#22c55e" },
];

const CATEGORIES = [
  { name: "Groceries", color: "#10b981" },
  { name: "Rent", color: "#ef4444" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Eating out", color: "#f59e0b" },
  { name: "Health", color: "#8b5cf6" },
  { name: "Fun", color: "#ec4899" },
];

function Features() {
  return (
    <section className="lp-defer px-5 sm:px-6 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeading title="What it does." />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="md:col-span-2"
            title="Import your bank statement"
            body="Upload the CSV your bank exports. Repeat shops are grouped so you categorise them once. Rows already imported are skipped."
          >
            <div className="w-full flex items-center gap-4">
              <div className="lp-file lp-wiggle hidden sm:flex shrink-0 w-20 h-24 bg-surface-elevated border border-edge-strong flex-col justify-end p-2">
                <span className="lp-mono text-[10px] text-content-tertiary">statement</span>
                <span className="lp-mono text-[12px] font-bold text-accent">.csv</span>
              </div>
              <span className="hidden sm:block text-content-muted text-xl">→</span>
              <ul className="flex-1 min-w-0 space-y-2">
                {IMPORT_GROUPS.map((g) => (
                  <li
                    key={g.name}
                    className="flex items-center gap-3 rounded-xl bg-surface-elevated border border-edge-default px-3 py-2"
                  >
                    <span className="text-[13px] font-semibold text-content-primary truncate">
                      {g.name}
                    </span>
                    <span className="text-[11px] font-bold text-content-tertiary">×{g.count}</span>
                    <span className="ml-auto lp-chip">
                      <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                      {g.cat}
                    </span>
                  </li>
                ))}
                <li className="text-[12px] text-content-tertiary px-1">
                  4 already imported, skipped
                </li>
              </ul>
            </div>
          </Card>

          <Card
            title="Any of 9 currencies"
            body="Record in the original currency. Totals convert to yours at daily rates."
          >
            <div className="w-full">
              <p className="lp-mono text-[28px] font-bold text-content-heading leading-none">
                ¥1,200
              </p>
              <p className="lp-mono mt-2 text-[15px] text-content-tertiary">≈ $13.40 at home</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <span
                    key={c}
                    className="lp-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-elevated text-content-tertiary"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card
            title="Transfers aren't spending"
            body="Moves between accounts are linked and kept out of your spending."
          >
            <div className="w-full flex items-center gap-2">
              <div className="lp-tile px-3 py-2.5 shrink-0">
                <p className="text-[11px] text-content-tertiary">Everyday</p>
                <p className="lp-mono text-[13px] font-bold text-content-heading">-500</p>
              </div>
              <div className="relative flex-1 h-3 lp-wire">
                <span className="lp-coin absolute inset-y-0 left-0 right-3">
                  <span className="absolute top-0 left-0 w-3 h-3 rounded-full bg-accent" />
                </span>
              </div>
              <div className="lp-tile px-3 py-2.5 shrink-0">
                <p className="text-[11px] text-content-tertiary">Savings</p>
                <p className="lp-mono text-[13px] font-bold text-accent">+500</p>
              </div>
            </div>
          </Card>

          <Card
            title="Categories that fit your life"
            body="11 built in, each one optional, plus up to 20 of your own."
          >
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c.name} className="lp-chip">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
              ))}
              <span className="lp-chip lp-wiggle border-dashed text-content-tertiary">+ yours</span>
            </div>
          </Card>

          <Card title="A dashboard you arrange" body="Drag, resize and hide widgets.">
            <div className="w-full grid grid-cols-3 grid-rows-2 gap-2 h-28">
              <div className="lp-tile col-span-2 p-2.5">
                <div className="h-1.5 w-10 rounded-full bg-edge-strong" />
                <div className="mt-2 h-3 w-16 rounded-full bg-content-heading/80" />
              </div>
              <div className="lp-tile lp-wiggle row-span-2 bg-accent-soft-bg border-accent/30 flex items-end p-2 gap-1">
                <div className="flex-1 h-[40%] rounded-sm bg-accent/50" />
                <div className="flex-1 h-[75%] rounded-sm bg-accent/70" />
                <div className="flex-1 h-[55%] rounded-sm bg-accent" />
              </div>
              <div className="lp-tile" />
              <div className="lp-tile" />
            </div>
          </Card>

          <Card
            className="md:col-span-2 lg:col-span-1"
            title="Export everything"
            body="CSV, XLSX or PDF, or all of it as a ZIP."
          >
            <div className="flex items-end gap-3">
              {[
                { ext: "csv", r: "-6deg" },
                { ext: "xlsx", r: "3deg" },
                { ext: "pdf", r: "-2deg" },
                { ext: "zip", r: "7deg" },
              ].map((f) => (
                <div
                  key={f.ext}
                  className="lp-file w-14 h-[4.5rem] bg-surface-elevated border border-edge-strong flex items-end p-1.5"
                  style={{ "--r": f.r } as React.CSSProperties}
                >
                  <span className="lp-mono text-[11px] font-bold text-content-secondary">
                    .{f.ext}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className="md:col-span-2"
            title="Lives on your phone"
            body="Add it to your home screen from the browser. No app store."
          >
            <div className="w-full flex items-center justify-center gap-6">
              <div className="w-24 h-40 rounded-[1.4rem] border-2 border-edge-strong bg-surface-elevated p-2.5 grid grid-cols-3 content-start gap-1.5">
                {Array.from({ length: 8 }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decoration
                  <span key={i} className="aspect-square rounded-md bg-edge-default" />
                ))}
                <span className="lp-wiggle aspect-square rounded-md bg-content-heading flex items-center justify-center">
                  <span className="cofr-brand text-[7px] text-surface-page">cofr</span>
                </span>
              </div>
              <p className="cofr-brand text-[15px] text-content-tertiary -rotate-6 max-w-[8rem]">
                ← right next to your banking app
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

// --- Privacy ---

const SMALL_PRINT = [
  "No bank logins. It only knows what you give it.",
  "Names and emails are encrypted at rest.",
  "No ads or marketing trackers. Data isn't sold or shared.",
  "Deleting your account deletes your transactions.",
];

function Privacy() {
  return (
    <section className="lp-defer px-5 sm:px-6 py-20 sm:py-28 bg-surface-elevated border-y border-edge-default">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <div className="lp-rise">
          <h2 className="lp-display text-content-heading text-[clamp(2.2rem,5.5vw,3.6rem)]">
            Privacy, plainly.
          </h2>
          <p className="mt-5 max-w-lg text-[16px] sm:text-[17px] leading-relaxed text-content-secondary">
            Four lines instead of twelve pages. The{" "}
            <Link to="/privacy" className="text-content-heading underline underline-offset-4">
              full policy
            </Link>{" "}
            has the details.
          </p>
        </div>

        <div className="lp-rise relative max-w-md w-full mx-auto lg:mx-0">
          <span
            className="lp-tape absolute -top-3 left-1/2 -ml-12 w-24 h-6 z-10"
            aria-hidden="true"
          />
          <div className="lp-napkin rounded-sm px-6 sm:px-8 pt-8 pb-6">
            <p className="cofr-brand text-[22px] leading-8">The small print</p>
            <p className="text-[13px] leading-8 opacity-60">(it isn't very small)</p>
            <ol className="mt-2">
              {SMALL_PRINT.map((line, i) => (
                <li key={line} className="flex gap-3 text-[15px] leading-8">
                  <span className="lp-mono opacity-50 shrink-0">{i + 1}.</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[15px] leading-8">
              Still not sure?{" "}
              <a href="#self-host" className="font-bold underline underline-offset-4">
                Run it yourself.
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Self-host ---

type Platform = "unix" | "windows";

const INSTALL: Record<Platform, { label: string; prompt: string; cmd: string; note: string }> = {
  unix: {
    label: "Linux / macOS",
    prompt: "$",
    cmd: "curl -fsSL https://cofr.cash/install.sh | bash",
    note: "Needs Docker: Docker Desktop on macOS, or docker.io on Linux.",
  },
  windows: {
    label: "Windows",
    prompt: ">",
    cmd: "irm https://cofr.cash/install.ps1 | iex",
    note: "Needs Docker Desktop. Run it in PowerShell as Administrator.",
  },
};

const INSTALL_OUTPUT = [
  "fresh install",
  "created infra/.env",
  "created apps/server/.env",
  "pulling images and starting services...",
  "waiting for cofr to be ready...",
];

function SelfHost() {
  const [platform, setPlatform] = useState<Platform>("unix");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) setPlatform("windows");
  }, []);

  const active = INSTALL[platform];

  const copy = () => {
    navigator.clipboard.writeText(active.cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section id="self-host" className="lp-defer scroll-mt-20 px-5 sm:px-6 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center">
        <div className="lp-rise">
          <h2 className="lp-display text-content-heading text-[clamp(2.2rem,5.5vw,3.6rem)]">
            Rather run it yourself?
          </h2>
          <p className="mt-5 max-w-lg text-[16px] sm:text-[17px] leading-relaxed text-content-secondary">
            One command on any machine with Docker. It generates secrets, starts Postgres and the
            app, and sets up HTTPS if you give it a domain. Run it again to update.
          </p>
          <p className="mt-4 text-[14px] text-content-tertiary">
            AGPL-3.0.{" "}
            <a
              href={`${GITHUB_URL}/blob/main/scripts/install.sh`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-heading underline underline-offset-4"
            >
              Read the installer
            </a>{" "}
            before you run it.
          </p>
        </div>

        <div className="lp-rise min-w-0">
          <div className="lp-term overflow-hidden">
            <div className="flex items-center gap-1 px-2 pt-2 border-b border-[#1e293b]">
              {(Object.keys(INSTALL) as Platform[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlatform(id)}
                  aria-pressed={platform === id}
                  className={`px-3.5 py-2 text-[13px] font-semibold rounded-t-lg transition-colors ${
                    platform === id
                      ? "bg-[#131c2e] text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {INSTALL[id].label}
                </button>
              ))}
            </div>
            <div className="lp-mono text-[13px] sm:text-[14px] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <code className="whitespace-nowrap text-white select-all">
                    <span className="text-[#34d399] font-bold">{active.prompt}</span> {active.cmd}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={copy}
                  aria-label={copied ? "Copied" : "Copy install command"}
                  className={`shrink-0 font-sans text-[12px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                    copied
                      ? "bg-[#34d399] text-[#0b1220]"
                      : "bg-[#1e293b] text-slate-300 hover:bg-[#334155]"
                  }`}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-4 space-y-1 text-slate-500" aria-hidden="true">
                {INSTALL_OUTPUT.map((line) => (
                  <p key={line} className="pl-4">
                    {line}
                  </p>
                ))}
                <p className="pt-2 text-[#34d399]">cofr is running</p>
                <p className="pl-4 text-slate-300">-&gt; http://localhost</p>
                <p className="pt-2">
                  <span className="text-[#34d399] font-bold">{active.prompt}</span>{" "}
                  <span className="lp-cursor" />
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-content-tertiary">{active.note}</p>
        </div>
      </div>
    </section>
  );
}

// --- FAQ ---

function FAQ() {
  return (
    <section className="lp-defer px-5 sm:px-6 py-20 sm:py-28 bg-surface-elevated border-y border-edge-default">
      <div className="max-w-3xl mx-auto">
        <SectionHeading title="Fair questions." />
        <div className="lp-rise border-t border-edge-strong">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="lp-faq group border-b border-edge-strong">
              <summary className="flex items-center gap-4 py-5 cursor-pointer text-[17px] sm:text-[19px] font-bold text-content-heading">
                <span className="flex-1">{item.q}</span>
                <span
                  className="lp-plus shrink-0 w-8 h-8 rounded-full border border-edge-strong flex items-center justify-center text-[18px] font-normal text-content-secondary group-hover:border-content-tertiary"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 pr-12 text-[15px] sm:text-[16px] leading-relaxed text-content-secondary">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Closing + footer ---

function Closing() {
  return (
    <section className="lp-defer px-5 sm:px-6 pt-24 sm:pt-32 pb-10 text-center">
      <div className="lp-rise max-w-2xl mx-auto">
        <h2 className="lp-display text-content-heading text-[clamp(2.4rem,7vw,4.4rem)]">
          See where it goes.
        </h2>
        <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
          <StartLink className={BTN_PRIMARY}>
            {IS_LANDING ? "Install cofr" : "Start tracking, free"}
            <span aria-hidden="true">→</span>
          </StartLink>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const links = [
    ...(IS_LANDING ? [] : [{ label: "Log in", to: "/login" }]),
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
  ];
  return (
    <footer className="px-5 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="py-8 border-t border-edge-default flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px]">
          <p className="text-content-tertiary text-center sm:text-left">
            <CofrBrand className="text-content-heading" /> &copy; {new Date().getFullYear()} · Open
            source under{" "}
            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-content-primary underline underline-offset-4"
            >
              AGPL-3.0
            </a>
          </p>
          <ul className="flex items-center gap-5">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-content-secondary hover:text-content-primary">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-content-secondary hover:text-content-primary"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
        <p className="lp-wordmark text-center -mb-[0.12em]" aria-hidden="true">
          cofr
        </p>
      </div>
    </footer>
  );
}

// --- Page ---

export default function Index() {
  return (
    <div className="lp min-h-screen overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <Features />
        <Privacy />
        <SelfHost />
        <FAQ />
        <Closing />
      </main>
      <Footer />
      <JsonLd />
    </div>
  );
}
