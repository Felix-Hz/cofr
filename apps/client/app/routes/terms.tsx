import { LegalLayout, LegalSection } from "~/components/LegalLayout";

export function meta() {
  return [
    { title: "Terms of Use | cofr" },
    {
      name: "description",
      content: "Terms of Use for cofr, the open-source, self-hosted personal finance tracker.",
    },
  ];
}

const LAST_UPDATED = "October 15, 2026";
const CONTACT_EMAIL = "me@felix-hzv.dev";

const TLDR = [
  "cofr is open-source software (AGPL-3.0) that you run yourself. There is no hosted service.",
  "The AGPL-3.0 licence governs the code. These terms cover the cofr.cash website and the cofr name.",
  "If you run an instance, you're responsible for it and for anyone else who uses it.",
  "cofr tracks money. It doesn't give financial advice.",
  "It's provided as is, with no warranty.",
];

const TOC = [
  { id: "about", label: "About These Terms" },
  { id: "licence", label: "The Software & Licence" },
  { id: "instances", label: "Running an Instance" },
  { id: "website", label: "The Website & Installer" },
  { id: "name", label: "The cofr Name & Logo" },
  { id: "no-advice", label: "No Financial Advice" },
  { id: "warranties", label: "Disclaimer of Warranties" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "changes", label: "Changes" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact" },
];

function Email() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="transition-colors"
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

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Use"
      subtitle="The short version: it's your server, your data and your responsibility"
      lastUpdated={LAST_UPDATED}
      tldr={TLDR}
      toc={TOC}
    >
      <LegalSection id="about" number="01" title="About These Terms">
        <p>
          cofr is open-source personal finance software maintained by Felix Hernandez Vieyra
          ("Maintainer," "we," "us," "our"). It is only available as software you install and run
          yourself. We don't operate a hosted version and don't provide accounts.
        </p>
        <p>
          These terms apply to your use of the cofr.cash website, the install scripts it serves, and
          the cofr name and logo. By using them you agree to these terms. Your rights to the
          software itself come from its licence, described below.
        </p>
        <p>
          If you're reading this page on a self-hosted instance, these terms are not an agreement
          between you and whoever runs that instance. Any rules for using their instance are up to
          them.
        </p>
      </LegalSection>

      <LegalSection id="licence" number="02" title="The Software & Licence">
        <p>
          The cofr source code is released under the{" "}
          <a
            href="https://github.com/Felix-Hz/cofr/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            GNU Affero General Public License v3.0
          </a>{" "}
          (AGPL-3.0). That licence is the only agreement covering your rights to use, modify and
          distribute the code. Nothing in these terms restricts the rights it gives you.
        </p>
        <p>
          In short: you can run, change and share cofr freely. If you distribute a modified version,
          or let other people use a modified version over a network, you must make your source code
          available to them under the same licence.
        </p>
      </LegalSection>

      <LegalSection id="instances" number="03" title="Running an Instance">
        <p>
          When you install cofr, you are the operator of that instance. We have no access to it and
          no control over it. You are responsible for:
        </p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>securing the server, its environment files and the encryption key</li>
          <li>keeping the software and its dependencies up to date</li>
          <li>backing up your data. If you lose the database or key, we can't recover it</li>
          <li>
            if other people use your instance, your obligations to them, including under privacy and
            data protection law
          </li>
          <li>complying with the laws that apply where you run it</li>
        </ul>
      </LegalSection>

      <LegalSection id="website" number="04" title="The Website & Installer">
        <p>
          The install scripts on cofr.cash download and start the published cofr images using
          Docker. They change your system, so read them before running them. The source is in the{" "}
          <a
            href="https://github.com/Felix-Hz/cofr/tree/main/scripts"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            repository
          </a>
          .
        </p>
        <p>
          Don't use the website or its scripts to attack, overload or interfere with it or anyone
          else. We may change or take down the website, scripts or published images at any time.
          Instances you've already installed keep running.
        </p>
      </LegalSection>

      <LegalSection id="name" number="05" title="The cofr Name & Logo">
        <p>
          The AGPL-3.0 licence covers the code, not the cofr name or logo. You're welcome to say
          your project is based on cofr. If you distribute a modified version or offer it as a
          service, please give it a different name and don't suggest it's made or endorsed by us.
        </p>
      </LegalSection>

      <LegalSection id="no-advice" number="06" title="No Financial Advice">
        <p>
          cofr is a tool for recording and organising your own financial information. Nothing in it,
          including summaries, category breakdowns, exchange rate conversions or imported data, is
          financial, investment, tax, accounting or legal advice.
        </p>
        <p>
          Check important figures against your bank's records. Exchange rates are reference rates
          and may differ from the rates you actually got.
        </p>
      </LegalSection>

      <LegalSection id="warranties" number="07" title="Disclaimer of Warranties">
        <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
          THE SOFTWARE, WEBSITE AND INSTALL SCRIPTS ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY
          KIND, EXPRESS OR IMPLIED, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
          A PARTICULAR PURPOSE AND NON-INFRINGEMENT, TO THE FULLEST EXTENT PERMITTED BY LAW.
        </p>
        <p>
          In plain English: we make no promises that cofr is free of bugs, that it calculates
          everything correctly, or that it suits any particular purpose. This matches sections 15
          and 16 of the AGPL-3.0.
        </p>
      </LegalSection>

      <LegalSection id="liability" number="08" title="Limitation of Liability">
        <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE MAINTAINER IS NOT LIABLE FOR ANY DIRECT,
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA,
          LOSS OF PROFITS OR FINANCIAL LOSS, ARISING FROM YOUR USE OF THE SOFTWARE, WEBSITE OR
          INSTALL SCRIPTS, HOWEVER CAUSED.
        </p>
        <p>
          In plain English: cofr is free, and you run it at your own risk. If something goes wrong,
          including lost data on your server, we're not liable for it.
        </p>
        <p>
          Some jurisdictions don't allow certain warranties or liabilities to be excluded. Where
          that's the case, these limits apply as far as the law allows. If you use cofr in trade in
          New Zealand, you agree the Consumer Guarantees Act 1993 does not apply.
        </p>
      </LegalSection>

      <LegalSection id="changes" number="09" title="Changes">
        <p>
          We may update these terms. When we do, we'll change the "Last updated" date above. Each
          release of the software ships with the version current at the time. Continuing to use the
          website or scripts after a change means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" number="10" title="Governing Law">
        <p>
          These terms are governed by the laws of New Zealand. Before starting any formal dispute,
          please contact us at <Email /> so we can try to sort it out informally. Otherwise,
          disputes are subject to the exclusive jurisdiction of the courts of New Zealand.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="11" title="Contact">
        <p>For questions about these terms:</p>
        <p>
          Felix Hernandez Vieyra
          <br />
          <Email />
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
