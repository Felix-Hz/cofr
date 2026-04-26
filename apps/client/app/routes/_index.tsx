import { useEffect, useRef, useState } from "react";
import { Link, redirect } from "react-router";
import ThemeToggle from "~/components/ThemeToggle";
import { isAuthenticated } from "~/lib/auth";

export function meta() {
  return [
    { title: "cofr - Finance, engineered for clarity" },
    {
      name: "description",
      content:
        "cofr - Composable dashboards, multi-currency tracking, and end-to-end encryption. Personal finance infrastructure built for people who take their money seriously.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cofr.cash" },
    { property: "og:site_name", content: "cofr" },
    { property: "og:locale", content: "en_US" },
    {
      property: "og:title",
      content: "cofr - Personal finance, engineered for clarity",
    },
    {
      property: "og:description",
      content:
        "Composable dashboards, multi-currency tracking, and end-to-end encryption. Finance infrastructure that respects your data.",
    },
    { property: "og:image", content: "https://cofr.cash/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "cofr - Personal finance dashboard" },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "cofr - Personal finance, engineered for clarity",
    },
    {
      name: "twitter:description",
      content: "Composable dashboards, multi-currency tracking, and end-to-end encryption.",
    },
    { name: "twitter:image", content: "https://cofr.cash/og-image.png" },
    { name: "robots", content: "index, follow" },
    { tagName: "link", rel: "canonical", href: "https://cofr.cash" },
  ];
}

export async function clientLoader() {
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

// --- JSON-LD ---

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "cofr",
      url: "https://cofr.cash",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description:
        "Personal finance infrastructure with composable dashboards, multi-currency support, and privacy-first encryption.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: {
        "@type": "Organization",
        name: "cofr",
        url: "https://cofr.cash",
      },
      screenshot: "https://cofr.cash/og-image.png",
      featureList: [
        "Composable drag-and-drop dashboards",
        "Multi-currency tracking with real-time exchange rates",
        "End-to-end encryption for personal data",
        "CSV, XLSX, and PDF data exports",
        "Financial account management with transfers",
        "Custom and built-in spending categories",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is cofr free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Free to sign up at cofr.cash. No credit card required, no data harvesting. If you prefer full control, self-hosting via Docker is also completely free with no feature restrictions.",
          },
        },
        {
          "@type": "Question",
          name: "How is my data encrypted and protected?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Personal information is encrypted field-by-field before it reaches the database using AES-128 (Fernet). All traffic is protected by TLS in transit. There are no marketing trackers, no ad networks, and no third-party data sharing.",
          },
        },
        {
          "@type": "Question",
          name: "Can I self-host cofr?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. cofr is open-source under AGPL-3.0. A single installer command spins up the full stack via Docker on Linux, macOS, or Windows. Secrets are generated automatically, and Caddy handles HTTPS via Let's Encrypt if you bring a domain. All data stays on your machine.",
          },
        },
        {
          "@type": "Question",
          name: "What currencies does cofr support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "USD, EUR, GBP, AUD, BRL, ARS, COP, JPY, and NZD. Exchange rates are refreshed daily from a public rates API. You can record each transaction in its native currency and view all totals converted to your preferred currency.",
          },
        },
        {
          "@type": "Question",
          name: "Can I export my data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Export your transactions, accounts, and categories as CSV, XLSX, or PDF. A full dump bundles everything into a ZIP. Your data is always yours — no lock-in.",
          },
        },
        {
          "@type": "Question",
          name: "Does cofr connect to my bank?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Not currently. Transactions are entered manually. cofr is built for people who want deliberate, eyes-open control over their finances.",
          },
        },
        {
          "@type": "Question",
          name: "Is there a mobile app?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "cofr is a Progressive Web App (PWA). Open it in your mobile browser and add it to your home screen for a full standalone experience with an icon and offline support. No app store required.",
          },
        },
        {
          "@type": "Question",
          name: "Can I permanently delete my account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Settings offers two options: a soft delete that deactivates your account and preserves your data (reactivatable by logging back in), and a hard delete that permanently removes your profile, all transactions, and auth connections with no recovery.",
          },
        },
      ],
    },
  ],
});

function CofrBrand({ className = "" }: { className?: string }) {
  return <span className={`cofr-brand ${className}`.trim()}>cofr</span>;
}

function JsonLd() {
  const ref = useRef<HTMLScriptElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = JSON_LD;
  }, []);
  return <script ref={ref} type="application/ld+json" />;
}

// --- Shared IntersectionObserver for scroll reveals ---
// Single observer instance for all Reveal elements (cheaper than one per element)

const revealCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function getRevealObserver() {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const cb = revealCallbacks.get(entry.target);
          if (cb) {
            cb();
            revealCallbacks.delete(entry.target);
            sharedObserver?.unobserve(entry.target);
          }
        }
      }
    },
    { threshold: 0.15, rootMargin: "-40px" },
  );
  return sharedObserver;
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      el.classList.add("is-visible");
      return;
    }

    const observer = getRevealObserver();
    revealCallbacks.set(el, () => el.classList.add("is-visible"));
    observer.observe(el);
    return () => {
      revealCallbacks.delete(el);
      observer.unobserve(el);
    };
  }, []);

  return ref;
}

// Shared observer for pausing infinite animations when off-screen
let animObserver: IntersectionObserver | null = null;

function getAnimObserver() {
  if (animObserver) return animObserver;
  animObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      }
    },
    { threshold: 0 },
  );
  return animObserver;
}

function useAnimPause<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const observer = getAnimObserver();
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return ref;
}

function Reveal({
  children,
  className = "",
  delay,
  as: Tag = "div",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "p" | "h2" | "h3";
  style?: React.CSSProperties;
}) {
  const ref = useReveal<HTMLElement>();
  const delayClass = delay ? `reveal-d${delay}` : "";
  return (
    // @ts-expect-error - Tag is a valid HTML element
    <Tag ref={ref} className={`reveal ${delayClass} ${className}`} style={style}>
      {children}
    </Tag>
  );
}

// --- Nav ---

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface-page/95 backdrop-blur-md border-b border-edge-default"
          : "bg-transparent"
      }`}
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <CofrBrand className="text-[20px] text-content-heading" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden sm:inline-flex h-9 px-4 items-center text-[13px] font-medium text-content-secondary hover:text-content-primary transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/login?mode=signup"
            className="h-9 px-4 sm:px-5 inline-flex items-center text-[13px] font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

// --- Hero ---

function Hero() {
  return (
    <section className="min-h-[calc(100svh-64px)] flex flex-col items-center justify-center px-5 sm:px-6 pt-28 pb-10 sm:pt-28 md:pt-36 sm:pb-10 md:pb-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="landing-hero-ambient absolute inset-x-0 top-0 h-[72%]" />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[22rem] h-[16rem] sm:w-[30rem] sm:h-[20rem] md:w-[680px] md:h-[400px] rounded-full bg-emerald/10 blur-[120px] sm:blur-[150px] animate-glow-pulse" />
        <div className="absolute top-[16%] right-[8%] w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full bg-white/40 dark:bg-emerald/6 blur-3xl" />
      </div>

      <header className="max-w-[52rem] mx-auto text-center relative z-10">
        <p className="hero-enter text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-5 sm:mb-6">
          Personal finance infrastructure
        </p>

        <h1 className="hero-enter hero-enter-d1 auth-title text-content-heading">
          Your money.
          <br />
          Your dashboard.
          <br />
          <span className="text-accent">Your rules.</span>
        </h1>

        <p className="hero-enter hero-enter-d2 mt-6 sm:mt-8 text-[1.05rem] sm:text-[1.2rem] md:text-[1.4rem] text-content-secondary max-w-2xl mx-auto leading-[1.75] tracking-[-0.01em] text-balance">
          Composable widgets. Multi-currency intelligence.
          <br className="hidden sm:block" />
          Every byte encrypted in transit and at rest.
          <br className="hidden sm:block" />
          <span className="text-content-heading font-medium">
            The finance tool you'd build yourself
          </span>{" "}
          - if you had the time.
        </p>

        <div className="hero-enter hero-enter-d3 mt-9 sm:mt-11 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-3 w-full sm:w-auto">
          <Link
            to="/login?mode=signup"
            className="h-12 w-full sm:w-auto px-8 inline-flex items-center justify-center text-[15px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors"
          >
            Start building
          </Link>
          <a
            href="#dashboard"
            className="h-12 w-full sm:w-auto px-8 inline-flex items-center justify-center text-[15px] font-medium text-content-secondary bg-surface-primary/80 dark:bg-surface-elevated/60 border border-edge-strong rounded-xl hover:bg-surface-hover backdrop-blur-sm transition-colors"
          >
            See how it works
          </a>
        </div>
      </header>

      {/* Dashboard mockup */}
      <div className="hero-enter hero-enter-d4 w-full max-w-[23.5rem] sm:max-w-4xl mx-auto mt-16 sm:mt-20 md:mt-24 mb-4 mockup-perspective">
        <DashboardMockup />
      </div>
    </section>
  );
}

// --- Dashboard Mockup ---

function DashboardMockup() {
  return (
    <div className="mockup-tilt select-none pointer-events-none" aria-hidden="true">
      <div className="bg-surface-primary border border-edge-default rounded-2xl shadow-2xl shadow-navy/5 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-edge-default">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-edge-strong" />
            <div className="w-2.5 h-2.5 rounded-full bg-edge-strong" />
            <div className="w-2.5 h-2.5 rounded-full bg-edge-strong" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-5 w-28 sm:w-40 bg-surface-elevated rounded-md" />
          </div>
          <div className="w-8 sm:w-[54px]" />
        </div>

        {/* Stats row */}
        <div className="p-4 sm:p-5 pb-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MockStatCard label="Income" value="$4,230" positive />
            <MockStatCard label="Spent" value="$2,847" />
            <MockStatCard label="Net" value="+$1,383" positive />
            <MockStatCard label="Accounts" value="3" />
          </div>
        </div>

        {/* Account strip */}
        <div className="px-4 sm:px-5 pt-4">
          <div className="flex gap-2 overflow-hidden">
            <MockAccountPill name="Checking" amount="$3,420" />
            <MockAccountPill name="Savings" amount="$12,800" />
            <MockAccountPill name="Investment" amount="$8,500" />
          </div>
        </div>

        {/* Transaction table */}
        <div className="p-4 sm:p-5">
          <div className="border border-edge-default rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-x-4 px-4 py-2 bg-surface-elevated text-[11px] font-medium text-content-muted uppercase tracking-wider">
              <span>Description</span>
              <span className="hidden sm:block">Category</span>
              <span className="text-right">Amount</span>
            </div>
            <MockTxRow desc="Grocery Store" cat="Food" amount="-$84.20" />
            <MockTxRow desc="Monthly Salary" cat="Income" amount="+$4,230.00" positive />
            <MockTxRow desc="Electric Bill" cat="Utilities" amount="-$127.50" />
            <MockTxRow desc="Coffee Shop" cat="Food" amount="-$6.40" last />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockStatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-surface-elevated rounded-xl p-3 sm:p-3.5">
      <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider">{label}</p>
      <p
        className={`text-[0.95rem] sm:text-lg font-semibold mt-1 ${positive ? "text-accent" : "text-content-heading"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MockAccountPill({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-surface-elevated rounded-xl whitespace-nowrap">
      <span className="text-[12px] font-medium text-content-secondary">{name}</span>
      <span className="text-[12px] font-semibold text-content-heading">{amount}</span>
    </div>
  );
}

function MockTxRow({
  desc,
  cat,
  amount,
  positive,
  last,
}: {
  desc: string;
  cat: string;
  amount: string;
  positive?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-x-3 sm:gap-x-4 px-3 sm:px-4 py-3 ${!last ? "border-b border-edge-default" : ""} ${positive ? "bg-positive-bg/50" : ""}`}
    >
      <span className="text-[12px] sm:text-[13px] text-content-primary truncate">{desc}</span>
      <span className="hidden sm:block text-[13px] text-content-tertiary">{cat}</span>
      <span
        className={`text-[12px] sm:text-[13px] font-medium text-right ${positive ? "text-positive-text-strong" : "text-content-primary"}`}
      >
        {amount}
      </span>
    </div>
  );
}

// --- Dashboard Builder Showcase ---

function DashboardShowcase() {
  return (
    <section id="dashboard" className="content-defer py-20 sm:py-28 md:py-36 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">
                Composable dashboards
              </p>
            </Reveal>
            <Reveal delay={1}>
              <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.08]">
                Drag. Drop.
                <br />
                <span className="text-content-secondary">See everything that matters.</span>
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-content-secondary max-w-lg">
                Stats cards, account balances, category breakdowns, transaction feeds. Pick the
                widgets you need, arrange them however you think, and ditch the rest. Your dashboard
                should work like your brain does.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Drag & drop", "Resize widgets", "Multiple layouts", "Real-time data"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 text-[12px] font-medium text-accent-soft-text bg-accent-soft-bg rounded-lg"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </Reveal>
          </div>

          {/* Visual - Widget grid mockup */}
          <Reveal delay={2} className="relative">
            <div className="feature-visual p-4 sm:p-6" aria-hidden="true">
              <div className="grid grid-cols-2 gap-3">
                {/* Stat widget */}
                <div className="bg-surface-elevated rounded-xl p-4">
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1">
                    Monthly Spend
                  </p>
                  <p className="text-xl font-bold text-content-heading">$2,847</p>
                  <p className="text-[12px] text-accent mt-1">-12% vs last month</p>
                </div>
                {/* Chart widget */}
                <div className="bg-surface-elevated rounded-xl p-4">
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-3">
                    By Category
                  </p>
                  <div className="flex items-end gap-1.5 h-12">
                    <div className="flex-1 bg-accent/60 rounded-sm" style={{ height: "100%" }} />
                    <div className="flex-1 bg-accent/40 rounded-sm" style={{ height: "70%" }} />
                    <div className="flex-1 bg-accent/30 rounded-sm" style={{ height: "45%" }} />
                    <div className="flex-1 bg-accent/20 rounded-sm" style={{ height: "85%" }} />
                    <div className="flex-1 bg-accent/15 rounded-sm" style={{ height: "30%" }} />
                  </div>
                </div>
                {/* Accounts widget - spans full width */}
                <div className="col-span-2 bg-surface-elevated rounded-xl p-4">
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-3">
                    Account Balances
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-content-primary">Checking</span>
                      <span className="text-[13px] font-semibold text-content-heading">
                        $3,420.00
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-content-primary">Savings</span>
                      <span className="text-[13px] font-semibold text-content-heading">
                        $12,800.00
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-content-primary">Investment</span>
                      <span className="text-[13px] font-semibold text-content-heading">
                        $8,500.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating widget - visual flair */}
            <FloatingWidget />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FloatingWidget() {
  const ref = useAnimPause<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="anim-pause-offscreen widget-float absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-36 sm:w-44 bg-surface-primary border border-edge-default rounded-xl p-3 shadow-xl shadow-navy/8 dark:shadow-black/30"
    >
      <p className="text-[10px] font-medium text-content-muted uppercase tracking-wider mb-1">
        Net Balance
      </p>
      <p className="text-lg font-bold text-accent">+$1,383</p>
    </div>
  );
}

// --- Privacy / Encryption ---

function Privacy() {
  return (
    <section className="content-defer landing-band-accent py-20 sm:py-28 md:py-36 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Encryption visualization */}
        <Reveal className="order-2 lg:order-1 flex items-center justify-center">
          <EncryptionVisual />
        </Reveal>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">
              Zero-compromise privacy
            </p>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.08]">
              Your data stays yours.
              <br />
              <span className="text-content-secondary">Period.</span>
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-content-secondary max-w-lg">
              Every piece of personal information is encrypted before it touches the database.
              Names, emails, financial details - individually encrypted at rest and protected in
              transit. Not metadata-visible. Not queryable by anyone but you.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-content-secondary max-w-lg">
              No ad networks. No third-party data sharing. No marketing trackers fingerprinting your
              sessions. Your financial information exists for one purpose: helping you understand
              your money.
            </p>
          </Reveal>
          <Reveal delay={4}>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-soft-bg flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-content-heading">
                    Encrypted at rest
                  </p>
                  <p className="text-[12px] text-content-tertiary mt-0.5">
                    Personal data encrypted field-by-field
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-soft-bg flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-content-heading">
                    Encrypted in transit
                  </p>
                  <p className="text-[12px] text-content-tertiary mt-0.5">
                    TLS everywhere, no exceptions
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-soft-bg flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-content-heading">No ad tracking</p>
                  <p className="text-[12px] text-content-tertiary mt-0.5">
                    No marketing trackers or data brokers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-soft-bg flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-content-heading">Your exports</p>
                  <p className="text-[12px] text-content-tertiary mt-0.5">
                    CSV, XLSX, PDF - your data leaves with you
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function EncryptionVisual() {
  const ref = useAnimPause<HTMLDivElement>();
  return (
    <div ref={ref} className="relative w-full max-w-xs sm:max-w-sm" aria-hidden="true">
      {/* Outer encryption layer */}
      <div className="enc-layer">
        <div className="bg-surface-primary rounded-xl p-5 sm:p-6 border border-edge-default">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">
              TLS Layer
            </span>
          </div>

          {/* Inner encryption layer */}
          <div className="enc-layer enc-layer-inner">
            <div className="bg-surface-elevated rounded-lg p-4 border border-edge-default">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z"
                    />
                  </svg>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                  Field Encryption
                </span>
              </div>

              {/* Encrypted data fields */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-content-tertiary w-12 shrink-0">name</span>
                  <div className="flex-1 h-5 bg-accent/8 rounded px-2 flex items-center">
                    <span className="text-[10px] font-mono text-accent/70 truncate">
                      gAAA...x4Kf
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-content-tertiary w-12 shrink-0">email</span>
                  <div className="flex-1 h-5 bg-accent/8 rounded px-2 flex items-center">
                    <span className="text-[10px] font-mono text-accent/70 truncate">
                      gAAA...m2Qp
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-content-tertiary w-12 shrink-0">amount</span>
                  <div className="flex-1 h-5 bg-accent/8 rounded px-2 flex items-center">
                    <span className="text-[10px] font-mono text-accent/70 truncate">
                      gAAA...r8Nw
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data flow dots */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="enc-dot anim-pause-offscreen" />
            <div className="enc-dot anim-pause-offscreen" />
            <div className="enc-dot anim-pause-offscreen" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Features ---

const FEATURES: { eyebrow: string; title: string; body: React.ReactNode; visual: string }[] = [
  {
    eyebrow: "Multi-currency",
    title: "One ledger. Every currency handled.",
    body: (
      <>
        NZD, EUR, USD, GBP and more. <CofrBrand /> keeps the original detail, then translates the
        big picture into the currency you actually think in. Real-time exchange rates, automatic
        conversion, zero mental math.
      </>
    ),
    visual: "currency",
  },
  {
    eyebrow: "Accounts & transfers",
    title: "Accounts that behave like accounts.",
    body: "Checking, savings, investment. Transfers between them tracked properly with linked transactions and direction markers. A proper financial map you can read in seconds.",
    visual: "accounts",
  },
  {
    eyebrow: "Smart categories",
    title: "Categories with a backbone.",
    body: "11 built-in categories get you moving fast. Custom categories keep the messy bits honest. Toggle system categories on or off. The result is less 'misc', more signal.",
    visual: "categories",
  },
] as const;

function Features() {
  return (
    <section className="content-defer py-20 sm:py-28 md:py-36 px-5 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-20 sm:space-y-28 md:space-y-36">
        {FEATURES.map((f, i) => {
          const reversed = i % 2 === 1;
          return (
            <div
              key={f.eyebrow}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
            >
              <div className={reversed ? "lg:order-2" : ""}>
                <Reveal>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">
                    {f.eyebrow}
                  </p>
                </Reveal>
                <Reveal delay={1}>
                  <h3 className="text-[1.75rem] sm:text-[2rem] md:text-[2.5rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.1]">
                    {f.title}
                  </h3>
                </Reveal>
                <Reveal delay={2}>
                  <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-content-secondary max-w-lg">
                    {f.body}
                  </p>
                </Reveal>
              </div>
              <Reveal delay={2} className={reversed ? "lg:order-1" : ""}>
                <FeatureVisual type={f.visual} />
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "currency") {
    return (
      <div className="feature-visual p-5 sm:p-6" aria-hidden="true">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-accent-soft-bg flex items-center justify-center text-[13px] font-bold text-accent">
                $
              </span>
              <div>
                <p className="text-[13px] font-semibold text-content-heading">USD</p>
                <p className="text-[11px] text-content-tertiary">US Dollar</p>
              </div>
            </div>
            <p className="text-[15px] font-semibold text-content-heading">$4,230.00</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-accent-soft-bg flex items-center justify-center text-[13px] font-bold text-accent">
                &#8364;
              </span>
              <div>
                <p className="text-[13px] font-semibold text-content-heading">EUR</p>
                <p className="text-[11px] text-content-tertiary">Euro</p>
              </div>
            </div>
            <p className="text-[15px] font-semibold text-content-heading">&euro;3,892.14</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-accent-soft-bg flex items-center justify-center text-[13px] font-bold text-accent">
                &pound;
              </span>
              <div>
                <p className="text-[13px] font-semibold text-content-heading">GBP</p>
                <p className="text-[11px] text-content-tertiary">British Pound</p>
              </div>
            </div>
            <p className="text-[15px] font-semibold text-content-heading">&pound;3,341.70</p>
          </div>
          <div className="mt-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/10">
            <p className="text-[11px] text-accent font-medium">
              Preferred currency: USD - all totals auto-converted
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === "accounts") {
    return (
      <div className="feature-visual p-5 sm:p-6" aria-hidden="true">
        <div className="space-y-3">
          {[
            { name: "Checking", balance: "$3,420", pct: 14 },
            { name: "Savings", balance: "$12,800", pct: 52 },
            { name: "Investment", balance: "$8,500", pct: 34 },
          ].map((a) => (
            <div key={a.name} className="p-3 bg-surface-elevated rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-content-heading">{a.name}</span>
                <span className="text-[13px] font-semibold text-content-heading">{a.balance}</span>
              </div>
              <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${a.pct}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 p-3 bg-accent/5 rounded-lg border border-accent/10">
            <svg
              className="w-4 h-4 text-accent shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            <span className="text-[12px] font-medium text-accent">
              Transfers tracked with linked transactions
            </span>
          </div>
        </div>
      </div>
    );
  }

  // categories
  return (
    <div className="feature-visual p-5 sm:p-6" aria-hidden="true">
      <div className="grid grid-cols-3 gap-2">
        {[
          { name: "Food", color: "#10b981" },
          { name: "Transport", color: "#3b82f6" },
          { name: "Utilities", color: "#f59e0b" },
          { name: "Rent", color: "#ef4444" },
          { name: "Health", color: "#8b5cf6" },
          { name: "Income", color: "#22c55e" },
        ].map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-2 p-2.5 bg-surface-elevated rounded-lg"
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-[12px] font-medium text-content-primary truncate">{c.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 p-2.5 bg-surface-elevated rounded-lg border border-dashed border-edge-strong">
        <svg
          className="w-4 h-4 text-content-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className="text-[12px] text-content-tertiary">Add custom category</span>
      </div>
      <p className="text-[11px] text-content-muted mt-3">
        11 built-in + up to 20 custom categories per account
      </p>
    </div>
  );
}

// --- How It Works ---

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Create your account",
      desc: "Email or Google. No onboarding circus, no questionnaire about your financial goals.",
    },
    {
      num: "02",
      title: "Mirror real life",
      desc: "Set up the accounts and categories you actually use. Checking, savings, investment. System defaults or custom.",
    },
    {
      num: "03",
      title: "Build your dashboard",
      desc: "Drag widgets into place. Stats cards, balance strips, category charts, transaction feeds. Arrange them how your brain works.",
    },
  ];

  return (
    <section className="content-defer landing-band py-20 sm:py-28 md:py-36 px-5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-14 sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">
            Up and running
          </p>
          <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.08]">
            Three steps to clarity.
          </h2>
        </Reveal>

        <div className="space-y-10 sm:space-y-12 relative">
          {/* Connecting line */}
          <div
            className="absolute left-[1.1rem] sm:left-[1.35rem] top-8 bottom-8 w-px bg-edge-default hidden sm:block"
            aria-hidden="true"
          />

          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i + 1}>
              <div className="flex gap-5 sm:gap-7 items-start relative">
                <span className="text-[1.1rem] sm:text-[1.25rem] font-bold text-accent leading-none mt-1 shrink-0 w-7 sm:w-8 relative z-10 bg-surface-page">
                  {s.num}
                </span>
                <div>
                  <h3 className="text-[17px] sm:text-lg font-semibold text-content-heading mb-1.5">
                    {s.title}
                  </h3>
                  <p className="text-[14px] sm:text-[15px] leading-relaxed text-content-secondary">
                    {s.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Self-Host Section ---

function SelfHostSection() {
  type Platform = "unix" | "windows";
  const [platform, setPlatform] = useState<Platform>("unix");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const pl = navigator.platform?.toLowerCase() ?? "";
    if (pl.includes("win") || ua.includes("windows")) setPlatform("windows");
  }, []);

  const tabs: { id: Platform; label: string; cmd: string; note: string }[] = [
    {
      id: "unix",
      label: "Linux / macOS",
      cmd: "curl -fsSL https://cofr.cash/install.sh | bash",
      note: "Requires Docker — apt install docker.io on Linux, Docker Desktop on macOS",
    },
    {
      id: "windows",
      label: "Windows",
      cmd: "irm https://cofr.cash/install.ps1 | iex",
      note: "Requires Docker Desktop for Windows — run in PowerShell as Administrator",
    },
  ];

  const activeTab = tabs.find((t) => t.id === platform)!;

  const copy = () => {
    navigator.clipboard.writeText(activeTab.cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const perks = [
    "Generates secrets automatically",
    "Auto-HTTPS via Let's Encrypt (bring your domain)",
    "Runs in about 2 minutes",
    "All data stays on your machine",
  ];

  return (
    <section className="content-defer landing-band-accent py-20 sm:py-28 md:py-36 px-5 sm:px-6 relative">
      <div
        className="section-divider absolute top-0 left-1/2 -translate-x-1/2 w-64"
        aria-hidden="true"
      />
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-12 sm:mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">
            Open source
          </p>
          <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.08] mb-4">
            Self-host in minutes.
          </h2>
          <p className="text-[15px] sm:text-base text-content-secondary max-w-lg mx-auto leading-relaxed">
            Own your data. No cloud accounts or API keys required. No tracking.
          </p>
        </Reveal>

        <Reveal delay={1}>
          {/* Platform tabs */}
          <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl border border-edge-default mb-4 w-full sm:w-fit sm:mx-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPlatform(t.id)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${
                  platform === t.id
                    ? "bg-surface-primary text-content-primary shadow-sm"
                    : "text-content-tertiary hover:text-content-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="bg-surface-elevated rounded-xl border border-edge-strong overflow-hidden flex items-center gap-3 px-4 py-3">
            <div className="overflow-x-auto flex-1 min-w-0">
              <code className="text-[13px] sm:text-sm font-mono text-content-primary whitespace-nowrap select-all">
                <span className="text-accent font-semibold">
                  {platform === "windows" ? ">" : "$"}
                </span>{" "}
                {activeTab.cmd}
              </code>
            </div>
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Copied!" : "Copy install command"}
              className={`shrink-0 flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
                copied
                  ? "bg-accent-soft-bg text-accent-soft-text"
                  : "bg-surface-hover text-content-muted hover:text-content-primary hover:bg-edge-default"
              }`}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path
                      d="M2 7L5 10L11 3"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <rect
                      x="4.5"
                      y="1.5"
                      width="7"
                      height="8.5"
                      rx="1.25"
                      stroke="currentColor"
                      strokeWidth="1.25"
                    />
                    <path
                      d="M2.5 4.5H2A1.5 1.5 0 0 0 .5 6v5A1.5 1.5 0 0 0 2 12.5h5A1.5 1.5 0 0 0 8.5 11v-.5"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Prereq note */}
          <p className="text-[12px] text-content-muted text-left sm:text-center mt-3 leading-relaxed">
            {activeTab.note}
          </p>

          {/* Perks */}
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[14px] text-content-secondary">
                <span className="text-accent font-bold shrink-0">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

// --- FAQ ---

const FAQ_ITEMS: { id: string; q: React.ReactNode; a: React.ReactNode }[] = [
  {
    id: "free",
    q: (
      <>
        Is <CofrBrand /> free?
      </>
    ),
    a: (
      <>
        Free to sign up at{" "}
        <Link to="/login?mode=signup" className="text-accent hover:underline">
          cofr.cash
        </Link>
        . No credit card required, no data harvesting. If you prefer full control, self-hosting via
        Docker is also completely free with no feature restrictions.
      </>
    ),
  },
  {
    id: "encryption",
    q: "How is my data encrypted and protected?",
    a: "Personal information is encrypted field-by-field before it reaches the database using AES-128 (Fernet). All traffic is protected by TLS in transit. There are no marketing trackers, no ad networks, and no third-party data sharing.",
  },
  {
    id: "self-host",
    q: (
      <>
        Can I self-host <CofrBrand />?
      </>
    ),
    a: (
      <>
        <CofrBrand /> is open-source under AGPL-3.0. A single installer command spins up the full
        stack via Docker on Linux, macOS, or Windows. Secrets are generated automatically, and Caddy
        handles HTTPS via Let's Encrypt if you bring a domain. All data stays on your machine.
      </>
    ),
  },
  {
    id: "currencies",
    q: (
      <>
        What currencies does <CofrBrand /> support?
      </>
    ),
    a: "USD, EUR, GBP, AUD, BRL, ARS, COP, JPY, and NZD. Exchange rates are refreshed daily from a public rates API. Record each transaction in its native currency and view all totals converted to your preferred currency.",
  },
  {
    id: "export",
    q: "Can I export my data?",
    a: "Yes. Export your transactions, accounts, and categories as CSV, XLSX, or PDF. A full dump bundles everything into a ZIP. Your data is always yours — no lock-in.",
  },
  {
    id: "bank",
    q: (
      <>
        Does <CofrBrand /> connect to my bank?
      </>
    ),
    a: (
      <>
        Not currently. Transactions are entered manually. <CofrBrand /> is built for people who want
        deliberate, eyes-open control over their finances.
      </>
    ),
  },
  {
    id: "mobile",
    q: "Is there a mobile app?",
    a: (
      <>
        <CofrBrand /> is a Progressive Web App (PWA). Open it in your mobile browser and add it to
        your home screen for a full standalone experience with an icon and offline support. No app
        store required.
      </>
    ),
  },
  {
    id: "delete",
    q: "Can I permanently delete my account?",
    a: "Yes. Settings offers two options: a soft delete that deactivates your account and preserves your data (you can reactivate simply by logging back in), and a hard delete that permanently removes your profile, all transactions, and auth connections with no recovery.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="content-defer landing-band py-20 sm:py-28 md:py-36 px-5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-12 sm:mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">
            Frequently asked
          </p>
          <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.08]">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={1}>
          <div>
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.id}
                  className={`faq-item${isOpen ? " is-open" : ""} ${i === 0 ? "border-t border-edge-default " : ""}border-b border-edge-default px-4 -mx-4 rounded-sm`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-4 py-5 text-left group"
                  >
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-accent opacity-60 w-5 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex-1 text-[15px] sm:text-base font-semibold transition-colors duration-200 ${isOpen ? "text-accent" : "text-content-heading group-hover:text-accent"}`}
                    >
                      {item.q}
                    </span>
                    <svg
                      className={`shrink-0 w-4 h-4 text-content-muted transition-transform duration-300 ${isOpen ? "rotate-180 text-accent" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`faq-answer${isOpen ? " is-open" : ""}`}>
                    <div>
                      <p className="text-[14px] sm:text-[15px] leading-relaxed text-content-secondary pb-5 pl-9">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// --- Final CTA ---

function FinalCTA() {
  return (
    <section className="content-defer py-20 sm:py-28 md:py-36 px-5 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="animate-scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <svg
          className="absolute -bottom-32 -left-32 w-[40rem] h-[40rem] opacity-20"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="500" r="280" stroke="var(--accent)" strokeWidth="1.5" />
          <circle cx="0" cy="500" r="200" stroke="var(--accent)" strokeWidth="1" />
          <circle cx="0" cy="500" r="120" stroke="var(--accent)" strokeWidth="0.75" />
        </svg>
        <svg
          className="absolute -top-32 -right-32 w-[40rem] h-[40rem] opacity-20"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="500" cy="0" r="280" stroke="var(--accent)" strokeWidth="1.5" />
          <circle cx="500" cy="0" r="200" stroke="var(--accent)" strokeWidth="1" />
          <circle cx="500" cy="0" r="120" stroke="var(--accent)" strokeWidth="0.75" />
        </svg>
      </div>
      <div
        className="section-divider absolute top-0 left-1/2 -translate-x-1/2 w-64"
        aria-hidden="true"
      />

      <Reveal className="text-center max-w-2xl mx-auto">
        <h2 className="text-[2rem] sm:text-[2.5rem] md:text-[3rem] font-bold tracking-[-0.03em] text-content-heading leading-[1.08] mb-5">
          Financial clarity,
          <br />
          <span className="text-accent">built on your terms.</span>
        </h2>
        <p className="text-[15px] sm:text-base text-content-secondary mb-9 sm:mb-11 max-w-lg mx-auto leading-relaxed">
          Free to start. Private by default. No credit card, no data harvesting, no catch. Just a
          sharper picture of where your money actually goes.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-3">
          <Link
            to="/login?mode=signup"
            className="h-12 w-full sm:w-auto px-8 inline-flex items-center justify-center text-[15px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors"
          >
            Start building for free
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

// --- Footer ---

const FOOTER_NAV = [
  {
    heading: "Product",
    items: [
      { label: "Get started", to: "/login?mode=signup", external: false },
      { label: "Log in", to: "/login", external: false },
      { label: "Self-host", to: "https://github.com/Felix-Hz/cofr", external: true },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy policy", to: "/privacy", external: false },
      { label: "Terms of service", to: "/terms", external: false },
    ],
  },
] as const;

function Footer() {
  return (
    <footer className="landing-band border-t border-edge-default px-5 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Main grid */}
        <Reveal>
          <div className="py-14 sm:py-16 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-10 sm:gap-20">
            {/* Brand column */}
            <div>
              <Link to="/" className="flex items-center mb-4">
                <CofrBrand className="text-[20px] text-content-heading" />
              </Link>
              <p className="text-[13px] text-content-tertiary leading-relaxed max-w-[220px]">
                clarity &gt; vibes.
              </p>
              <a
                href="https://github.com/Felix-Hz/cofr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 px-3 py-1.5 rounded-lg border border-edge-default text-[12px] font-medium text-content-secondary hover:text-content-primary hover:border-edge-strong transition-colors group"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                AGPL-3.0 · Open source
                <svg
                  className="w-3 h-3 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            </div>

            {/* Nav columns */}
            {FOOTER_NAV.map((col) => (
              <div key={col.heading}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted mb-4">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      {item.external ? (
                        <a
                          href={item.to}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-content-secondary hover:text-accent transition-colors"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          to={item.to}
                          className="text-[13px] text-content-secondary hover:text-accent transition-colors"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Bottom bar */}
        <div className="py-5 border-t border-edge-default flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[12px] text-content-muted">
            <CofrBrand /> &copy; {new Date().getFullYear()}. All rights reserved.
          </span>
          <span className="text-[12px] text-content-muted tracking-wide">
            No trackers. No data brokers. No catch.
          </span>
        </div>
      </div>
    </footer>
  );
}

// --- Main Page ---

export default function Index() {
  return (
    <div className="landing-page min-h-screen bg-surface-page relative overflow-x-hidden">
      <div
        className="landing-grid absolute inset-x-0 top-0 bottom-0 pointer-events-none"
        aria-hidden="true"
      />
      <Nav />
      <main>
        <Hero />
        <DashboardShowcase />
        <Privacy />
        <Features />
        <HowItWorks />
        <SelfHostSection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <JsonLd />
    </div>
  );
}
