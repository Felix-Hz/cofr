import { useEffect, useRef, useState } from "react";
import { Link, redirect } from "react-router";
import {
  CategoriesFigure,
  CurrencyFigure,
  DashboardFigure,
  ExportFigure,
  HeatmapFigure,
  ImportFigure,
  PhoneFigure,
  TrendBarsFigure,
} from "~/components/landing/Figures";
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
    a: "Yes. It's open source (AGPL-3.0) and you run it on your own machine, with every feature.",
  },
  {
    q: "Does it connect to my bank?",
    a: "No. Add transactions yourself or import a CSV statement exported from your bank.",
  },
  {
    q: "What's encrypted?",
    a: "Names, usernames and emails are encrypted at rest; all traffic uses HTTPS. Transactions aren't encrypted so they can be totalled, but they live in your own database.",
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
function StartLink({
  className,
  children,
  ...data
}: {
  className: string;
  children: React.ReactNode;
  "data-variant"?: string;
  "data-size"?: string;
}) {
  if (IS_LANDING) {
    return (
      <a href="#self-host" className={className} data-event="cta:install" {...data}>
        {children}
      </a>
    );
  }
  return (
    <Link to="/login?mode=signup" className={className} {...data}>
      {children}
    </Link>
  );
}

const BTN_PRIMARY = "sm-button h-11 px-5";
const BTN = "sm-button h-11 px-5";

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
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" aria-label="cofr home">
          <CofrBrand className="text-[22px] text-content-heading" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="cofr on GitHub"
            data-event="nav:github"
            className="h-9 w-9 rounded flex items-center justify-center text-content-tertiary hover:text-content-primary hover:bg-surface-hover transition-colors"
          >
            <GitHubIcon className="w-4 h-4" />
          </a>
          <ThemeToggle />
          {!IS_LANDING && (
            <Link
              to="/login"
              className="sm-button hidden sm:inline-flex"
              data-variant="ghost"
              data-size="sm"
            >
              Log in
            </Link>
          )}
          <StartLink className="sm-button" data-variant="primary" data-size="sm">
            {IS_LANDING ? "Install" : "Sign up"}
          </StartLink>
        </div>
      </div>
    </nav>
  );
}

// --- Hero ---

const RECEIPT_LINES: { label: string; amount: string; flagged?: boolean }[] = [
  { label: "Rent", amount: "1,650.00" },
  { label: "Groceries", amount: "412.80" },
  { label: "Flat whites (23)", amount: "126.50", flagged: true },
  { label: "Bus & trains", amount: "96.00" },
  { label: "Streaming", amount: "18.99" },
  { label: "Dentist", amount: "180.00" },
  { label: "Takeaways", amount: "143.20" },
];

function Hero() {
  return (
    <section className="px-5 sm:px-6 pt-12 sm:pt-16 lg:pt-20 pb-20 sm:pb-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-14 lg:gap-16 items-end">
        <header>
          <p className="lp-in label text-accent">Personal finance, self-hosted</p>
          <h1 className="lp-display lp-in mt-6 text-content-heading text-[clamp(3rem,8.5vw,6.25rem)]">
            Where did all my <em className="italic">money</em> go?
          </h1>
          <p
            className="lp-lead lp-in mt-7 max-w-xl text-[clamp(1.1875rem,1rem+0.6vw,1.4375rem)] text-content-secondary"
            style={{ "--d": 1 } as React.CSSProperties}
          >
            Track spending across accounts and currencies, import your bank statement, and see where
            it went. Open source. No ads, no bank logins.
          </p>
          <div
            className="lp-in mt-9 flex flex-col sm:flex-row gap-3"
            style={{ "--d": 2 } as React.CSSProperties}
          >
            <StartLink className={BTN_PRIMARY} data-variant="primary">
              {IS_LANDING ? "Install it" : "Start tracking"}
              <span aria-hidden="true">→</span>
            </StartLink>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN}
              data-event="cta:github"
            >
              <GitHubIcon className="w-4 h-4" />
              Read the code
            </a>
          </div>
          <dl
            className="lp-in mt-10 grid grid-cols-3 max-w-md border-t border-edge-default"
            style={{ "--d": 3 } as React.CSSProperties}
          >
            {[
              ["Licence", "AGPL-3.0"],
              ["Currencies", String(SUPPORTED_CURRENCIES.length)],
              ["Runs on", "Docker"],
            ].map(([k, v]) => (
              <div key={k} className="pt-3 pr-4">
                <dt className="label">{k}</dt>
                <dd className="lp-mono mt-1 text-[15px] text-content-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        <Receipt />
      </div>
    </section>
  );
}

function Receipt() {
  return (
    <figure
      className="lp-in w-full max-w-[23rem] mx-auto lg:mr-0"
      style={{ "--d": 2 } as React.CSSProperties}
    >
      <figcaption className="mb-3 flex items-baseline justify-between gap-4">
        <span className="label text-accent">Fig 1</span>
        <span className="label">Receipt, November</span>
      </figcaption>
      <div className="lp-receipt lp-mono text-[13px] sm:text-[13.5px]" aria-hidden="true">
        <div className="text-center">
          <p className="label text-content-primary">A normal month</p>
          <p className="text-[11px] text-content-tertiary mt-1">thanks for shopping, apparently</p>
        </div>
        <div className="my-4 border-t border-dashed border-edge-strong" />
        <ul className="space-y-2.5">
          {RECEIPT_LINES.map((line) => (
            <li
              key={line.label}
              className={`relative flex items-baseline ${line.flagged ? "mb-7" : ""}`}
            >
              <span className="whitespace-nowrap">{line.label}</span>
              <span className="lp-dots" />
              <span>{line.amount}</span>
              {line.flagged && (
                <>
                  <span className="lp-flag" />
                  <span className="lp-flag-note">hmm.</span>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="my-4 border-t border-dashed border-edge-strong" />
        <ul className="space-y-1.5">
          <li className="flex">
            <span>OUT</span>
            <span className="lp-dots" />
            <span>−2,627.49</span>
          </li>
          <li className="flex">
            <span>IN</span>
            <span className="lp-dots" />
            <span>+4,230.00</span>
          </li>
          <li className="flex font-semibold text-[15px] mt-3 pt-3 border-t border-content-heading">
            <span>KEPT</span>
            <span className="lp-dots" />
            <span>1,602.51</span>
          </li>
        </ul>
      </div>
      <p className="mt-3 text-[13px] leading-snug text-content-tertiary">
        One month, totalled the way cofr does it. The flat whites were a surprise.
      </p>
    </figure>
  );
}

// --- Sections ---

function SectionHead({ n, title, aside }: { n: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[12rem_1fr] gap-x-10 gap-y-4 pt-4 mb-10 sm:mb-14">
      <p className="label text-accent">[&nbsp;{n}&nbsp;]</p>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="lp-display text-content-heading text-[clamp(2.25rem,5vw,3.5rem)] max-w-3xl">
          {title}
        </h2>
        {aside}
      </div>
    </div>
  );
}

const CATEGORIES = [
  { name: "Groceries", color: "#2f56c9" },
  { name: "Rent", color: "#d9541e" },
  { name: "Transport", color: "#0f8a6a" },
  { name: "Eating out", color: "#8a5cd6" },
];

const FEATURES: {
  title: string;
  body: string;
  spec?: React.ReactNode;
  figure?: { n: number; node: React.ReactNode };
}[] = [
  {
    title: "Import your bank statement",
    figure: { n: 2, node: <ImportFigure /> },
    body: "Upload the CSV your bank exports. Repeat shops are grouped so you categorise them once. Rows already imported are skipped.",
    spec: (
      <span className="lp-mono">
        Corner Grocer ×6 · City Bus ×9 · Payroll ×2
        <span className="block text-content-tertiary">4 already imported, skipped</span>
      </span>
    ),
  },
  {
    title: `Any of ${SUPPORTED_CURRENCIES.length} currencies`,
    figure: { n: 3, node: <CurrencyFigure /> },
    body: "Record in the original currency. Totals convert to yours at daily rates.",
    spec: (
      <span className="lp-mono">
        −¥1,200 <span className="text-content-tertiary">≈ −$13.40 at home</span>
      </span>
    ),
  },
  {
    title: "Categories that fit your life",
    figure: { n: 4, node: <CategoriesFigure /> },
    body: "11 built in, each one optional, plus up to 20 of your own.",
    spec: (
      <span className="flex flex-wrap gap-x-4 gap-y-1">
        {CATEGORIES.map((c) => (
          <span key={c.name} className="inline-flex items-center gap-1.5">
            <span className="size-1.5" style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
        <span className="text-content-tertiary">+ yours</span>
      </span>
    ),
  },
  {
    title: "A dashboard you arrange",
    figure: { n: 5, node: <DashboardFigure /> },
    body: "Drag, resize and hide widgets. Each one says what it found, not just what it measured.",
  },
  {
    title: "Export everything",
    figure: { n: 6, node: <ExportFigure /> },
    body: "Your data leaves with you whenever you want it.",
    spec: <span className="lp-mono">.csv · .xlsx · .pdf · .zip</span>,
  },
  {
    title: "Lives on your phone",
    figure: { n: 7, node: <PhoneFigure /> },
    body: "Add it to your home screen from the browser. It opens full screen; no app store.",
  },
];

function Features() {
  return (
    <section className="lp-defer px-5 sm:px-6 pb-24 sm:pb-32">
      <div className="max-w-6xl mx-auto lp-section">
        <SectionHead
          n="01"
          title="What it does."
          aside={<span className="label">Highlights</span>}
        />
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 lg:pl-[calc(12rem+2.5rem)]">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="border-t border-edge-default pt-4">
              {f.figure && (
                <figure className="mb-5">
                  <span className="label text-accent">Fig {f.figure.n}</span>
                  <div className="mt-3 flex h-36 items-end">{f.figure.node}</div>
                </figure>
              )}
              <p className="label">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-[17px] font-medium text-content-heading">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-content-secondary">{f.body}</p>
              {f.spec && <div className="mt-4 text-[13px] text-content-primary">{f.spec}</div>}
            </li>
          ))}
        </ol>
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-[12rem_1fr] gap-x-10 gap-y-6">
          <p className="label">The dashboard</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
            <figure className="border-t border-content-heading pt-4">
              <span className="label text-accent">Fig 8</span>
              <div className="mt-4">
                <TrendBarsFigure />
              </div>
            </figure>
            <figure className="border-t border-content-heading pt-4">
              <span className="label text-accent">Fig 9</span>
              <div className="mt-4">
                <HeatmapFigure />
              </div>
            </figure>
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
    <section id="self-host" className="lp-defer scroll-mt-20 px-5 sm:px-6 pb-24 sm:pb-32">
      <div className="max-w-6xl mx-auto lp-section">
        <SectionHead n="02" title="Install it in one command." />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-10 lg:gap-14 lg:pl-[calc(12rem+2.5rem)]">
          <div>
            <p className="lp-lead text-[19px] text-content-secondary">
              Works on any machine with Docker. It generates secrets, starts Postgres and the app,
              and sets up HTTPS if you give it a domain. Run it again to update.
            </p>
            <dl className="sm-spec mt-8">
              <div>
                <dt>Licence</dt>
                <dd>AGPL-3.0</dd>
              </div>
              <div>
                <dt>Needs</dt>
                <dd>{active.note.replace(/^Needs /, "")}</dd>
              </div>
              <div>
                <dt>Installer</dt>
                <dd>
                  <a
                    href={`${GITHUB_URL}/blob/main/scripts/install.sh`}
                    data-event="install:read-script"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-content-primary underline decoration-accent underline-offset-4 hover:text-accent"
                  >
                    Read it before you run it
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <figure className="min-w-0">
            <figcaption className="mb-3 flex items-center justify-between gap-4">
              <span className="label text-accent">Fig 10</span>
              <fieldset className="sm-segmented m-0 min-w-0">
                <legend className="sr-only">Platform</legend>
                {(Object.keys(INSTALL) as Platform[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPlatform(id)}
                    data-event={`install:tab:${id}`}
                    aria-pressed={platform === id}
                    data-state={platform === id ? "on" : "off"}
                    className="sm-segmented-item"
                  >
                    {INSTALL[id].label}
                  </button>
                ))}
              </fieldset>
            </figcaption>
            <div className="lp-term lp-mono text-[13px] sm:text-[14px] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <code className="whitespace-nowrap text-content-heading select-all">
                    <span className="text-accent">{active.prompt}</span> {active.cmd}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={copy}
                  data-event={`install:copy:${platform}`}
                  aria-label={copied ? "Copied" : "Copy install command"}
                  className="sm-button shrink-0"
                  data-size="sm"
                  data-variant={copied ? "primary" : undefined}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-4 space-y-1 text-content-tertiary" aria-hidden="true">
                {INSTALL_OUTPUT.map((line) => (
                  <p key={line} className="pl-4">
                    {line}
                  </p>
                ))}
                <p className="pt-2 text-content-heading">
                  <span className="sm-square mr-2" />
                  cofr is running
                </p>
                <p className="pl-4 text-content-secondary">-&gt; http://localhost</p>
                <p className="pt-2">
                  <span className="text-accent">{active.prompt}</span>{" "}
                  <span className="lp-cursor" />
                </p>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

// --- FAQ ---

function FAQ() {
  return (
    <section className="lp-defer px-5 sm:px-6 pb-24 sm:pb-32">
      <div className="max-w-6xl mx-auto lp-section">
        <SectionHead n="03" title="Fair questions." />
        <ol className="border-t border-content-heading lg:ml-[calc(12rem+2.5rem)] max-w-3xl">
          {FAQ_ITEMS.map((item, i) => (
            <li key={item.q}>
              <details className="lp-faq border-b border-edge-default">
                <summary className="flex items-baseline gap-5 py-5 cursor-pointer">
                  <span className="label text-accent w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[18px] sm:text-[20px] font-medium text-content-heading">
                    {item.q}
                  </span>
                  <span className="label shrink-0" aria-hidden="true">
                    <span className="lp-closed">[+]</span>
                    <span className="lp-open">[−]</span>
                  </span>
                </summary>
                <p className="pb-6 pl-11 pr-12 text-[16px] leading-relaxed text-content-secondary">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// --- Closing + footer ---

function Closing() {
  return (
    <section className="lp-defer px-5 sm:px-6 pb-16">
      <div className="max-w-6xl mx-auto lp-section pt-16 sm:pt-24 grid grid-cols-1 lg:grid-cols-[12rem_1fr] gap-x-10">
        <p className="label text-accent">[&nbsp;04&nbsp;]</p>
        <div>
          <h2 className="lp-display text-content-heading text-[clamp(2.5rem,7vw,4.75rem)]">
            See where it goes.
          </h2>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <StartLink className={BTN_PRIMARY} data-variant="primary">
              {IS_LANDING ? "Install cofr" : "Start tracking"}
              <span aria-hidden="true">→</span>
            </StartLink>
          </div>
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
          <ul className="flex items-center gap-6">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="label hover:text-content-primary">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="label hover:text-content-primary"
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
        <Features />
        <SelfHost />
        <FAQ />
        <Closing />
      </main>
      <Footer />
      <JsonLd />
    </div>
  );
}
