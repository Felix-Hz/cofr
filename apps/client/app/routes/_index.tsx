import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, redirect } from "react-router";
import ThemeToggle from "~/components/ThemeToggle";
import { isAuthenticated } from "~/lib/auth";

export function meta() {
  return [
    { title: "cofr - Finance, with clarity" },
    {
      name: "description",
      content:
        "cofr — Private-by-default expense tracking for real accounts, real currencies, and people tired of guessing.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://cofr.cash" },
    {
      property: "og:title",
      content: "cofr - Personal finance tracking with clarity",
    },
    {
      property: "og:description",
      content: "cofr — Track spending and understand your money with clarity.",
    },
    { property: "og:image", content: "https://cofr.cash/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "cofr - Personal finance tracking with clarity",
    },
    {
      name: "twitter:description",
      content: "cofr — Track spending and understand your money with clarity.",
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
  "@type": "SoftwareApplication",
  name: "cofr",
  url: "https://cofr.cash",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Personal finance tracking with multi-currency support, and privacy-first encryption.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
});

function JsonLd() {
  const ref = useRef<HTMLScriptElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = JSON_LD;
    }
  }, []);

  return <script ref={ref} type="application/ld+json" />;
}

// --- Animation helpers ---

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const transition = (delay = 0) => ({
  duration: 0.7,
  ease: [0.16, 1, 0.3, 1] as const,
  delay,
});

function AnimateOnScroll({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeUp}
      transition={transition(delay)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Section Components ---

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface-page/95 backdrop-blur-md border-b border-edge-default"
          : "bg-transparent"
      }`}
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="cofr" className="h-7 w-7 logo-auto" />
          <span className="text-[15px] font-semibold text-content-heading tracking-tight">
            cofr
          </span>
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
            className="h-9 px-4 sm:px-5 inline-flex items-center text-[13px] font-medium text-white bg-emerald hover:bg-emerald-hover rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="min-h-[calc(100svh-64px)] flex flex-col items-center justify-center px-5 sm:px-6 pt-28 pb-10 sm:pt-28 md:pt-36 sm:pb-10 md:pb-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="landing-hero-ambient absolute inset-x-0 top-0 h-[72%]" />
        <div className="absolute top-[11%] left-1/2 -translate-x-1/2 w-[24rem] h-[18rem] sm:w-[32rem] sm:h-[22rem] md:w-[720px] md:h-[420px] rounded-full bg-emerald/10 blur-[110px] sm:blur-[140px] animate-glow-pulse" />
        <div className="absolute top-[18%] right-[6%] w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-white/45 dark:bg-emerald/8 blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={transition(0)}
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-6 text-left sm:text-center"
        >
          Private by design. Sharp by default.
        </motion.p>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={transition(0.1)}
          className="text-[2.25rem] sm:text-6xl md:text-[4.6rem] font-bold tracking-tight text-content-heading leading-[1.05] text-left sm:text-center"
        >
          Stop guessing
          <br className="hidden sm:block" />
          {" where your money went."}
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={transition(0.2)}
          className="mt-7 sm:mt-7 text-[1rem] sm:text-lg md:text-[1.35rem] text-content-secondary max-w-lg sm:max-w-2xl sm:mx-auto leading-relaxed text-left sm:text-center"
        >
          cofr tracks spending across real accounts and multiple currencies without the usual
          finance-theatre fluff. Just a clean ledger, a sharper picture, and privacy baked in.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={transition(0.3)}
          className="mt-10 sm:mt-11 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-3 w-full sm:w-auto"
        >
          <Link
            to="/login?mode=signup"
            className="h-12 w-full sm:w-auto px-8 inline-flex items-center justify-center text-[15px] font-medium text-white bg-emerald hover:bg-emerald-hover rounded-xl transition-colors"
          >
            Start clean
          </Link>
          <a
            href="#features"
            className="h-12 w-full sm:w-auto px-8 inline-flex items-center justify-center text-[15px] font-medium text-content-secondary bg-surface-primary/80 dark:bg-surface-elevated/60 border border-edge-strong rounded-xl hover:bg-surface-hover backdrop-blur-sm transition-colors"
          >
            See the workflow
          </a>
        </motion.div>
      </div>

      {/* Dashboard Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        className="w-full max-w-[23.5rem] sm:max-w-4xl mx-auto mt-18 sm:mt-20 md:mt-24 mb-4 mockup-perspective"
      >
        <DashboardMockup />
      </motion.div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="mockup-tilt select-none pointer-events-none">
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
            <StatCard label="Income" value="$4,230" positive />
            <StatCard label="Spent" value="$2,847" />
            <StatCard label="Net" value="+$1,383" positive />
            <StatCard label="Accounts" value="3" />
          </div>
        </div>

        {/* Account strip */}
        <div className="px-4 sm:px-5 pt-4">
          <div className="flex gap-2 overflow-hidden">
            <AccountPill name="Checking" amount="$3,420" />
            <AccountPill name="Savings" amount="$12,800" />
            <AccountPill name="Investment" amount="$8,500" />
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
            <TransactionRow desc="Grocery Store" cat="Food" amount="-$84.20" />
            <TransactionRow desc="Monthly Salary" cat="Income" amount="+$4,230.00" positive />
            <TransactionRow desc="Electric Bill" cat="Utilities" amount="-$127.50" />
            <TransactionRow desc="Coffee Shop" cat="Food" amount="-$6.40" last />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
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

function AccountPill({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-surface-elevated rounded-xl whitespace-nowrap">
      <span className="text-[12px] font-medium text-content-secondary">{name}</span>
      <span className="text-[12px] font-semibold text-content-heading">{amount}</span>
    </div>
  );
}

function TransactionRow({
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
      className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-x-3 sm:gap-x-4 px-3 sm:px-4 py-3 ${
        !last ? "border-b border-edge-default" : ""
      } ${positive ? "bg-positive-bg/50" : ""}`}
    >
      <span className="text-[12px] sm:text-[13px] text-content-primary truncate">{desc}</span>
      <span className="hidden sm:block text-[13px] text-content-tertiary">{cat}</span>
      <span
        className={`text-[12px] sm:text-[13px] font-medium text-right ${
          positive ? "text-positive-text-strong" : "text-content-primary"
        }`}
      >
        {amount}
      </span>
    </div>
  );
}

function Features() {
  const features = [
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          />
        </svg>
      ),
      title: "One ledger. Every currency headache handled.",
      body: "NZD, EUR, USD, GBP and more. cofr keeps the original detail, then translates the big picture into the currency you actually think in.",
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0 1 15.75 3.75H18a2.25 2.25 0 0 1 2.25 2.25v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 15.75V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25z"
          />
        </svg>
      ),
      title: "Categories with a backbone",
      body: "Built-ins get you moving fast. Custom categories keep the messy bits honest. The result is less 'misc', more signal.",
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
      ),
      title: "Accounts that behave like accounts",
      body: "Checking, savings, investment, transfers, balances. Not a gamified wallet. A proper financial map you can read in seconds.",
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-24 md:py-32 px-5 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <AnimateOnScroll className="text-center mb-14 sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            The useful part
          </p>
          <h2 className="text-[2rem] sm:text-3xl md:text-4xl font-bold tracking-tight text-content-heading">
            Built for people who want
            <br className="hidden sm:block" /> the numbers to behave.
          </h2>
          <p className="mt-4 sm:mt-5 max-w-xl sm:max-w-2xl mx-auto text-[14px] sm:text-[15px] leading-relaxed text-content-secondary">
            cofr is opinionated where it should be and quiet where it matters. You get a faster read
            on spending, balances, and patterns without turning your finances into a side hobby.
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <AnimateOnScroll key={f.title} delay={i * 0.1}>
              <div className="bg-surface-primary border border-edge-default rounded-2xl p-6 sm:p-8 hover:-translate-y-1 transition-transform duration-300 h-full">
                <div className="w-10 h-10 rounded-xl bg-accent-soft-bg flex items-center justify-center text-accent mb-5">
                  {f.icon}
                </div>
                <h3 className="text-[17px] font-semibold text-content-heading mb-2">{f.title}</h3>
                <p className="text-[14px] leading-relaxed text-content-secondary">{f.body}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="py-20 sm:py-24 md:py-32 px-5 sm:px-6 bg-surface-elevated">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <AnimateOnScroll>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            Privacy by design
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-content-heading mb-6">
            Your data stays yours
          </h2>
          <p className="text-[15px] leading-relaxed text-content-secondary mb-4">
            Every piece of personal information is encrypted at rest. Names, emails, financial
            details - all protected with industry-standard encryption before they reach the
            database.
          </p>
          <p className="text-[15px] leading-relaxed text-content-secondary">
            No analytics trackers harvesting your data. No third-party access. Your financial
            information exists for one purpose: helping you understand your money.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.15}>
          <div className="flex items-center justify-center">
            <ShieldGraphic />
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}

function ShieldGraphic() {
  return (
    <div className="relative w-48 h-56 flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-[40%_40%_50%_50%] bg-emerald/8 blur-2xl" />
      {/* Shield shape */}
      <div className="relative w-36 h-44 rounded-[40%_40%_50%_50%] border-2 border-accent/30 bg-linear-to-b from-accent/10 to-transparent flex items-center justify-center">
        <div className="w-20 h-24 rounded-[40%_40%_50%_50%] border border-accent/20 bg-accent/5 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Open your account",
      desc: "Email, password, done. No onboarding circus.",
    },
    {
      num: "2",
      title: "Mirror real life",
      desc: "Set up the accounts and categories you actually use, not the fantasy version finance apps keep inventing.",
    },
    {
      num: "3",
      title: "See the leaks",
      desc: "Track transactions, watch balances settle, and spot the habits that quietly tax your month.",
    },
  ];

  return (
    <section className="py-20 sm:py-24 md:py-32 px-5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <AnimateOnScroll className="text-center mb-14 sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            Quick to useful
          </p>
          <h2 className="text-[2rem] sm:text-3xl md:text-4xl font-bold tracking-tight text-content-heading">
            Five minutes to a much less mysterious bank balance
          </h2>
        </AnimateOnScroll>

        <div className="space-y-10 sm:space-y-12">
          {steps.map((s, i) => (
            <AnimateOnScroll key={s.num} delay={i * 0.1}>
              <div className="flex gap-4 sm:gap-6 items-start">
                <span className="text-[1.75rem] sm:text-3xl font-bold text-accent leading-none mt-0.5 shrink-0 w-7 sm:w-8">
                  {s.num}
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold text-content-heading mb-1">{s.title}</h3>
                  <p className="text-[14px] leading-relaxed text-content-secondary">{s.desc}</p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 sm:py-24 md:py-32 px-5 sm:px-6 relative">
      {/* Gradient divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-linear-to-r from-transparent via-edge-strong to-transparent" />

      <AnimateOnScroll className="text-center">
        <h2 className="text-[2rem] sm:text-3xl md:text-4xl font-bold tracking-tight text-content-heading mb-4">
          Give your money a better narrator
        </h2>
        <p className="text-[15px] sm:text-base text-content-secondary mb-8 sm:mb-10 max-w-lg mx-auto">
          Free to start, fast to trust, and blissfully uninterested in turning budgeting into a
          personality.
        </p>
        <Link
          to="/login?mode=signup"
          className="h-12 w-full sm:w-auto px-8 inline-flex items-center justify-center text-[15px] font-medium text-white bg-emerald hover:bg-emerald-hover rounded-xl transition-colors"
        >
          Open cofr
        </Link>
      </AnimateOnScroll>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 sm:py-12 px-5 sm:px-6 border-t border-edge-default">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="cofr" className="h-5 w-5 logo-auto" />
          <span className="text-sm text-content-tertiary">
            cofr &copy; {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-content-tertiary">
          <Link to="/login" className="hover:text-content-primary transition-colors">
            Log in
          </Link>
          {/* <span className="cursor-default">Privacy</span> */}
          {/* <span className="cursor-default">Terms</span> */}
        </div>
      </div>
    </footer>
  );
}

// --- Main Page ---

export default function Index() {
  return (
    <div className="landing-page min-h-screen bg-surface-page relative overflow-x-hidden">
      <div className="landing-grid-top absolute inset-x-0 top-0 h-[72rem] sm:h-[56rem] pointer-events-none" />
      <div className="landing-grid-bottom absolute inset-x-0 top-[94rem] sm:top-[68rem] bottom-0 pointer-events-none" />
      <Nav />
      <Hero />
      <Features />
      <Trust />
      <HowItWorks />
      <FinalCTA />
      <Footer />

      {/* JSON-LD Structured Data */}
      <JsonLd />
    </div>
  );
}
