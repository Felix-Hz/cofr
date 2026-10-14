import { LegalLayout, LegalSection, LegalTable } from "~/components/LegalLayout";

export function meta() {
  return [
    { title: "Privacy Policy | cofr" },
    {
      name: "description",
      content:
        "Privacy Policy for cofr: what the cofr.cash website collects, and how the self-hosted software handles data.",
    },
  ];
}

const LAST_UPDATED = "October 15, 2026";
const CONTACT_EMAIL = "me@felix-hzv.dev";

const TLDR = [
  "cofr is software you run on your own server. There is no hosted service and no cofr account.",
  "Whoever runs an instance controls its data. The cofr project has no access to it.",
  "The software sends nothing to the cofr project: no analytics, no telemetry, no error reports.",
  "The cofr.cash website has no accounts, no cookies and no analytics.",
  "Names, usernames and emails are encrypted at rest. Transactions are not.",
];

const TOC = [
  { id: "scope", label: "Who We Are & Scope" },
  { id: "website", label: "The cofr.cash Website" },
  { id: "instances", label: "Self-Hosted Instances" },
  { id: "data-stored", label: "Data the Software Stores" },
  { id: "connections", label: "Outbound Connections" },
  { id: "security", label: "Encryption & Security" },
  { id: "retention", label: "Deletion & Retention" },
  { id: "storage", label: "Browser Storage" },
  { id: "rights", label: "Your Rights" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact" },
];

function Email() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      style={{ color: "var(--accent)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--accent)";
      }}
    >
      {CONTACT_EMAIL}
    </a>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "var(--content-heading)" }}>{children}</strong>;
}

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="What the website collects, and what the software does with your data"
      lastUpdated={LAST_UPDATED}
      tldr={TLDR}
      toc={TOC}
    >
      <LegalSection id="scope" number="01" title="Who We Are & Scope">
        <p>
          cofr is open-source personal finance software maintained by Felix Hernandez Vieyra
          ("Maintainer," "we," "us," "our"), reachable at <Email />.
        </p>
        <p>
          cofr is only available as software that you install and run yourself. There is no hosted
          version and no central cofr account. This policy covers two things:
        </p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            the <Term>cofr.cash website</Term>, which describes the project and serves the
            installer; and
          </li>
          <li>
            how the <Term>cofr software</Term> handles data on the instances people run, so that
            instance operators and their users know what to expect.
          </li>
        </ul>
        <p>
          If you're reading this page on a self-hosted instance, that instance is run by whoever
          installed it, not by us. See <a href="#instances" style={{ color: "var(--accent)" }}>Self-Hosted Instances</a>.
        </p>
      </LegalSection>

      <LegalSection id="website" number="02" title="The cofr.cash Website">
        <p>
          cofr.cash is a static website. It has no sign-up, no login and no forms, and we don't run
          analytics, advertising or tracking cookies on it.
        </p>
        <p>Visiting it still involves a few third parties, as with any website:</p>
        <LegalTable
          headers={["Provider", "Purpose", "Data involved"]}
          rows={[
            [
              "Amazon Web Services (S3, CloudFront)",
              "Hosting and delivering the website and install scripts",
              "IP address and request metadata, processed to serve the page",
            ],
            [
              "Google Fonts",
              "Loading the site's typefaces",
              "IP address and user agent, sent by your browser to Google",
            ],
          ]}
        />
        <p>
          The site stores your light/dark theme choice in your browser and registers a service
          worker so it loads faster on repeat visits. Neither is sent to us.
        </p>
      </LegalSection>

      <LegalSection id="instances" number="03" title="Self-Hosted Instances">
        <p>
          Each cofr instance is an independent deployment on infrastructure chosen by whoever runs
          it (the "Instance Operator"). We have no access to, knowledge of, or control over any
          instance or the data on it.
        </p>
        <p>
          For data protection purposes, the Instance Operator is the data controller for their
          instance. If you run an instance that other people use, you are responsible for complying
          with the privacy laws that apply to you, including giving those people any notice they are
          owed. The rest of this policy describes what the software does, which you can use as a
          starting point.
        </p>
        <p>
          If you use an instance someone else runs, contact them about your data. We can't see it,
          change it or delete it.
        </p>
      </LegalSection>

      <LegalSection id="data-stored" number="04" title="Data the Software Stores">
        <p>
          A cofr instance stores the following in its own PostgreSQL database, on the Instance
          Operator's server:
        </p>
        <LegalTable
          headers={["Category", "Data", "Encrypted at rest"]}
          rows={[
            ["Account", "First name, last name, username", "Yes (Fernet)"],
            ["Email sign-in", "Email address", "Yes (Fernet)"],
            ["Email sign-in", "Password hash (bcrypt)", "N/A (one-way hash)"],
            ["Google sign-in", "Google account ID", "No (needed to look up the account)"],
            ["Google sign-in", "Email address and display name", "Yes (Fernet)"],
            [
              "Financial",
              "Transactions, amounts, merchants, notes, categories, accounts, import history",
              "No",
            ],
            ["Preferences", "Preferred currency, dashboard layout, session timeout", "No"],
            [
              "Email suppression",
              "SHA-256 hashes of addresses that bounced or complained",
              "N/A (hash only)",
            ],
          ]}
        />
        <p>
          Bank statements you import are parsed in memory. Only the transactions you choose to save
          are stored, not the file.
        </p>
      </LegalSection>

      <LegalSection id="connections" number="05" title="Outbound Connections">
        <p>
          The software does not send analytics, telemetry or error reports to the cofr project. A
          default installation makes one kind of outbound request:
        </p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <Term>Exchange rates:</Term> once a day the server fetches public rates from Frankfurter
            (frankfurter.app). No user data is sent.
          </li>
        </ul>
        <p>
          The Instance Operator can turn on extra integrations by adding their own credentials. Each
          one then sends data to that provider, under the operator's own account:
        </p>
        <LegalTable
          headers={["Integration", "Purpose", "Data shared"]}
          rows={[
            ["Resend", "Verification and password reset emails", "Recipient email address"],
            ["Google OAuth", "Sign in with Google", "Handled by Google during sign-in"],
            [
              "Sentry",
              "Error tracking",
              "Error details, user agent and, if enabled in the build, session replays",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id="security" number="06" title="Encryption & Security">
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <Term>Encryption at rest:</Term> names, usernames, emails and display names are
            encrypted field by field with Fernet (AES-128-CBC with HMAC-SHA256) before they're
            written to the database. The key lives in the server's environment file, not in the
            database.
          </li>
          <li>
            <Term>Passwords:</Term> hashed with bcrypt and never stored in a recoverable form.
          </li>
          <li>
            <Term>In transit:</Term> when the installer is given a domain, Caddy serves the instance
            over HTTPS with a Let's Encrypt certificate. On localhost it uses plain HTTP.
          </li>
        </ul>
        <p>
          Everything else, including server access, firewalls, updates and backups, is up to the
          Instance Operator. The software can't protect data on a server that isn't itself secure.
        </p>
      </LegalSection>

      <LegalSection id="retention" number="07" title="Deletion & Retention">
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <Term>Your account:</Term> kept until you delete it.
          </li>
          <li>
            <Term>Deactivation:</Term> hides your account and keeps your data. Logging in again
            restores it.
          </li>
          <li>
            <Term>Permanent deletion:</Term> removes your profile, transactions, accounts and
            sign-in connections from the instance's database. This can't be undone. It's in
            Settings, under Danger Zone. It doesn't reach copies in backups the Instance Operator
            has made.
          </li>
          <li>
            <Term>Exports:</Term> generated files are kept in memory only and discarded after 30
            minutes.
          </li>
          <li>
            <Term>Email suppression list:</Term> hashes of addresses that bounced or complained are
            kept so the instance doesn't email them again. They can't be reversed into an address.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="storage" number="08" title="Browser Storage">
        <p>
          The app uses no tracking or advertising cookies. It keeps the following in your browser's
          local storage, and none of it is shared with third parties:
        </p>
        <LegalTable
          headers={["Item", "Purpose", "Kept"]}
          rows={[
            [
              "Session token",
              "Keeps you signed in to the instance",
              "Until you log out or it expires",
            ],
            ["Theme", "Remembers light or dark mode", "Until you change it"],
            ["Session timeout", "Applies your inactivity timeout", "Until you change it"],
            ["Last activity time", "Signs you out after inactivity", "Until you log out"],
            ["Default account", "Pre-selects an account in forms", "Until you change it"],
            ["Sign-in lockout time", "Blocks retries during a lockout", "Up to 15 minutes"],
            [
              "Currency and timezone flags",
              "Detects your currency and timezone only once",
              "Until cleared",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id="rights" number="09" title="Your Rights">
        <p>Inside the app, on any instance, you can:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>
            <Term>See and correct</Term> your profile, transactions and preferences
          </li>
          <li>
            <Term>Export</Term> everything as CSV, XLSX, PDF or a ZIP from Settings
          </li>
          <li>
            <Term>Delete</Term> your account and data permanently from Settings
          </li>
        </ul>
        <p>
          For anything else about data on an instance, contact its Instance Operator. Depending on
          where you and they are, you may have further rights under laws such as the GDPR or the
          CCPA, which you exercise with them.
        </p>
        <p>
          The Maintainer holds no personal data about cofr users. For questions about the cofr.cash
          website, contact <Email />.
        </p>
      </LegalSection>

      <LegalSection id="changes" number="10" title="Changes to This Policy">
        <p>
          We may update this policy, for example when the software changes what it stores. When we
          do, we'll change the "Last updated" date above. Each release of the software ships with
          the version of this policy current at the time.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="11" title="Contact">
        <p>For questions about this policy or the cofr.cash website:</p>
        <p>
          Felix Hernandez Vieyra
          <br />
          <Email />
        </p>
        <p>
          To report a security issue, see{" "}
          <a
            href="https://github.com/Felix-Hz/cofr/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            SECURITY.md
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
