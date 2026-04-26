import { LegalLayout, LegalSection, LegalTable } from "~/components/LegalLayout";

export function meta() {
  return [
    { title: "Privacy Policy | cofr" },
    {
      name: "description",
      content: "Privacy Policy for cofr: what we collect, how we use it, and your rights.",
    },
  ];
}

const LAST_UPDATED = "April 26, 2026";

const TLDR = [
  "We collect only what's necessary to run the service. No analytics. No ad networks. No data brokers.",
  "Your financial data and PII are encrypted at rest using Fernet (AES-128). TLS everywhere.",
  "We use Resend for transactional email and Sentry for error tracking (production only). That's it.",
  "You can export all your data (CSV, XLSX, PDF) or permanently delete your account at any time.",
  "Self-hosted instances are entirely independent. We have zero access to data on your server.",
];

const TOC = [
  { id: "who-we-are", label: "Who We Are" },
  { id: "scope", label: "Scope" },
  { id: "data-collected", label: "Data We Collect" },
  { id: "how-we-use", label: "How We Use Your Data" },
  { id: "security", label: "Encryption & Security" },
  { id: "sharing", label: "Data Sharing" },
  { id: "selfhost", label: "Self-Hosted Instances" },
  { id: "retention", label: "Data Retention" },
  { id: "rights", label: "Your Rights" },
  { id: "gdpr", label: "GDPR" },
  { id: "ccpa", label: "CCPA" },
  { id: "cookies", label: "Cookies & Local Storage" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact" },
];

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="What we collect, why we collect it, and how you stay in control"
      lastUpdated={LAST_UPDATED}
      tldr={TLDR}
      toc={TOC}
    >
      <LegalSection id="who-we-are" number="01" title="Who We Are">
        <p>
          cofr is operated by Felix Hernandez Vieyra, an individual ("Operator," "we," "us," "our"),
          reachable at{" "}
          <a
            href="mailto:me@felix-hzv.dev"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            me@felix-hzv.dev
          </a>
          .
        </p>
        <p>
          For the purposes of data protection law, the Operator is the data controller for personal
          data processed in connection with the hosted Service at cofr.cash.
        </p>
      </LegalSection>

      <LegalSection id="scope" number="02" title="Scope">
        <p>
          This Privacy Policy applies to the hosted Service at cofr.cash and any associated
          transactional communications (e.g. verification emails).
        </p>
        <p>
          It does not apply to self-hosted instances of cofr. If you deploy cofr on your own
          infrastructure, you are the data controller for that deployment and are independently
          responsible for applicable privacy obligations.
        </p>
      </LegalSection>

      <LegalSection id="data-collected" number="03" title="Data We Collect">
        <p>We collect only the data necessary to operate the Service:</p>
        <LegalTable
          headers={["Category", "Data", "Encrypted at rest"]}
          rows={[
            ["Account", "First name, last name, username", "Yes (Fernet/AES-128)"],
            ["Auth: Email/Password", "Email address", "Yes (Fernet/AES-128)"],
            [
              "Auth: Email/Password",
              "Password hash (bcrypt)",
              "N/A (one-way hash, never recoverable)",
            ],
            ["Auth: Google OAuth", "Google provider user ID", "No (needed for account lookup)"],
            ["Auth: Google OAuth", "Display name (from Google)", "Yes (Fernet/AES-128)"],
            [
              "Financial",
              "Transactions, amounts, categories, accounts, merchant tags",
              "No (structured user data)",
            ],
            ["Preferences", "Preferred currency, theme, session timeout setting", "No"],
            ["Technical", "IP address (rate limiting only, not stored long-term)", "N/A"],
            ["Technical", "JWT session token (stored in your browser, not our server)", "N/A"],
            ["Technical", "User agent (Sentry error context, production only)", "N/A"],
            [
              "Email suppression",
              "SHA-256 hashed email addresses (bounce/complaint list)",
              "N/A (hash only, not reversible)",
            ],
          ]}
        />
        <p>
          We do not collect payment information (there is no paid tier requiring card details),
          location data, biometric data, or browsing history outside the Service.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" number="04" title="How We Use Your Data">
        <p>We use the data we collect for the following purposes only:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Authentication:</strong> verifying
            your identity on login and maintaining your session
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Operating the Service:</strong>{" "}
            storing and serving your financial data, calculating balances and summaries, applying
            exchange rates
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Transactional email:</strong>{" "}
            sending account verification emails and password reset links via Resend. No marketing
            emails unless you explicitly opt in (no opt-in mechanism currently exists)
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Error tracking:</strong> detecting
            and diagnosing bugs via Sentry in production environments only
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Security:</strong> rate-limiting
            authentication endpoints using your IP address to prevent brute-force attacks
          </li>
        </ul>
        <p>
          We do not use your data for advertising, profiling, training machine learning models, or
          any purpose not listed above.
        </p>
      </LegalSection>

      <LegalSection id="security" number="05" title="Encryption & Security">
        <p>We take security seriously and apply the following controls:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Encryption at rest:</strong>{" "}
            Personal identifiers (name, email, display name) are encrypted field-by-field using
            Fernet (AES-128-CBC with HMAC-SHA256) before being written to the database. The
            encryption key is never stored alongside the data.
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Encryption in transit:</strong> All
            connections to cofr.cash use TLS. Unencrypted HTTP is not accepted.
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Password storage:</strong> Passwords
            are hashed with bcrypt and never stored in recoverable form.
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>No tracking infrastructure:</strong>{" "}
            No advertising pixels, no third-party analytics, no data broker integrations.
          </li>
        </ul>
        <p>
          While we implement industry-standard safeguards, no system is completely immune to
          breaches. In the event of a breach affecting your personal data, we will notify affected
          users as required by applicable law.
        </p>
      </LegalSection>

      <LegalSection id="sharing" number="06" title="Data Sharing">
        <p>
          We do not sell, rent, or trade your personal data. We share data only with the following
          sub-processors required to operate the Service:
        </p>
        <LegalTable
          headers={["Service", "Purpose", "Data shared"]}
          rows={[
            ["Resend", "Transactional email delivery", "Your email address"],
            [
              "Sentry",
              "Error tracking & diagnostics (production only)",
              "Error context, anonymised session data, user agent",
            ],
            [
              "DigitalOcean (Sydney, Australia)",
              "Cloud hosting & database",
              "All data at rest on our servers",
            ],
            ["Cloudflare", "Tunnel & network routing", "IP addresses, request metadata"],
            [
              "Frankfurter.app",
              "Daily exchange rate data",
              "No user data (public API, rates only)",
            ],
          ]}
        />
        <p>
          We may disclose personal data if required by law, court order, or governmental authority.
          We will make reasonable efforts to notify you before doing so, unless legally prohibited.
        </p>
      </LegalSection>

      <LegalSection id="selfhost" number="07" title="Self-Hosted Instances">
        <p>
          If you deploy cofr on your own server, the Operator has no access to, knowledge of, or
          control over any data processed on that instance. You are the sole data controller and are
          independently responsible for compliance with privacy and data protection laws applicable
          in your jurisdiction.
        </p>
        <p>This Privacy Policy does not cover self-hosted deployments in any way.</p>
      </LegalSection>

      <LegalSection id="retention" number="08" title="Data Retention">
        <p>We retain your data as follows:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Active accounts:</strong> retained
            for as long as your account exists
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Soft delete:</strong> your account
            becomes immediately inaccessible. Data is retained and restored if you log in again
            within a reasonable period
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Hard delete:</strong> permanently
            and irreversibly removes your profile, all transactions, all financial accounts, and all
            auth connections. No recovery is possible after this action. Available in Settings →
            Danger Zone
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Export jobs:</strong> export
            artifacts are held in-memory only and automatically deleted after 30 minutes
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Email suppression list:</strong>{" "}
            SHA-256 hashed email addresses from bounces and complaints are retained to prevent
            re-sending to invalid or opted-out addresses. These hashes cannot be reversed to
            identify you
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" number="09" title="Your Rights">
        <p>You have the following rights with respect to your personal data:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Access:</strong> view all your
            financial data and account information in the dashboard at any time
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Export (portability):</strong>{" "}
            download your data as CSV, XLSX, PDF, or a full ZIP archive from Settings → Export.
            Formats are open standards. Your data is not locked to cofr.
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Correction:</strong> edit your
            profile, transactions, and preferences at any time
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Deletion:</strong> permanently
            delete your account and all associated data from Settings → Danger Zone
          </li>
        </ul>
        <p>
          To exercise any right that cannot be completed within the application, contact us at{" "}
          <a
            href="mailto:me@felix-hzv.dev"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            me@felix-hzv.dev
          </a>
          . We will respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="gdpr" number="10" title="GDPR: European Users">
        <p>
          If you are located in the European Economic Area (EEA) or United Kingdom, the following
          additional rights and information apply.
        </p>
        <p>
          <strong style={{ color: "var(--content-heading)" }}>Legal basis for processing:</strong>{" "}
          We process your personal data on the basis of contractual necessity (Article 6(1)(b)
          GDPR): your data is processed to provide the Service you signed up for. Rate-limiting and
          security operations are processed on the basis of our legitimate interests (Article
          6(1)(f) GDPR) in protecting the Service and its users.
        </p>
        <p>Your additional rights under GDPR include:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>Right to restrict processing</li>
          <li>Right to object to processing based on legitimate interests</li>
          <li>
            Right to lodge a complaint with your local supervisory authority (e.g. your national
            Data Protection Authority)
          </li>
        </ul>
        <p>
          International transfer notice: the hosted Service stores data on DigitalOcean
          infrastructure in Sydney, Australia. Australia is not recognised as adequate by the
          European Commission under Article 45 GDPR. By voluntarily using the Service, you provide
          explicit consent to this transfer under Article 49(1)(a) GDPR. If you do not consent, you
          should not use the hosted Service. You may instead self-host cofr on infrastructure in
          your preferred jurisdiction.
        </p>
      </LegalSection>

      <LegalSection id="ccpa" number="11" title="CCPA: California Residents">
        <p>
          If you are a California resident, you have the following rights under the California
          Consumer Privacy Act (CCPA):
        </p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Right to know:</strong> you may
            request disclosure of the categories and specific pieces of personal information we have
            collected about you
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Right to delete:</strong> you may
            request deletion of your personal information (available directly via hard-delete in
            Settings)
          </li>
          <li>
            <strong style={{ color: "var(--content-heading)" }}>Right to opt out of sale:</strong>{" "}
            we do not sell your personal information. This right is not applicable.
          </li>
        </ul>
        <p>We do not discriminate against users who exercise their CCPA rights.</p>
      </LegalSection>

      <LegalSection id="cookies" number="12" title="Cookies & Local Storage">
        <p>
          We do not use tracking cookies or advertising cookies. We store the following data in your
          browser's local storage:
        </p>
        <LegalTable
          headers={["Key", "Purpose", "Persists"]}
          rows={[
            [
              "JWT token",
              "Authenticates your session with our API",
              "Until you log out or token expires",
            ],
            ["Theme preference", "Remembers your light/dark mode choice", "Until you change it"],
            [
              "Session timeout setting",
              "Applies your inactivity timeout preference",
              "Until you change it",
            ],
            [
              "Rate-limit lockout timestamps",
              "Prevents submission during auth lockout periods",
              "Up to 15 minutes",
            ],
            [
              "Currency detection flag",
              "Ensures locale-based currency is only inferred once",
              "Persistent",
            ],
          ]}
        />
        <p>
          None of these items are shared with third parties or used for tracking across other
          websites.
        </p>
      </LegalSection>

      <LegalSection id="children" number="13" title="Children">
        <p>
          cofr is not directed at children. If you believe that a child has created an account on
          the Service, please contact us immediately at{" "}
          <a
            href="mailto:me@felix-hzv.dev"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            me@felix-hzv.dev
          </a>{" "}
          and we will promptly delete the account and all associated data.
        </p>
      </LegalSection>

      <LegalSection id="changes" number="14" title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will update the "Last
          updated" date at the top of this page. For material changes, we will make reasonable
          efforts to notify you via the email address on your account before the changes take
          effect.
        </p>
        <p>
          Your continued use of the Service after the effective date constitutes your acceptance of
          the updated Policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="15" title="Contact">
        <p>For privacy-related questions, data access requests, or to report a concern:</p>
        <p>
          Felix Hernandez Vieyra
          <br />
          <a
            href="mailto:me@felix-hzv.dev"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            me@felix-hzv.dev
          </a>
        </p>
        <p>We aim to respond to all privacy inquiries within 30 days.</p>
      </LegalSection>
    </LegalLayout>
  );
}
