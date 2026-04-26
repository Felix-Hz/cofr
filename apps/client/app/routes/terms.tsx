import { LegalLayout, LegalSection } from "~/components/LegalLayout";

export function meta() {
  return [
    { title: "Terms of Service | cofr" },
    {
      name: "description",
      content: "Terms of Service for cofr, the personal finance tracking platform.",
    },
  ];
}

const LAST_UPDATED = "April 26, 2026";

const TLDR = [
  "cofr is free to use at cofr.cash. No hidden charges, no credit card required.",
  "Your financial data belongs to you. Export it anytime, delete it permanently anytime.",
  "cofr is a tracking tool, not a financial advisor. Nothing here is financial or investment advice.",
  "The service is provided as-is with no uptime guarantee.",
  "The codebase is AGPL-3.0 open source. Self-hosted instances are fully independent.",
];

const TOC = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "eligibility", label: "Eligibility" },
  { id: "account", label: "Account Responsibilities" },
  { id: "license", label: "License Grant" },
  { id: "prohibited", label: "Prohibited Conduct" },
  { id: "selfhost", label: "Self-Hosting & Open Source" },
  { id: "ip", label: "Intellectual Property" },
  { id: "user-content", label: "User Content" },
  { id: "no-advice", label: "No Financial Advice" },
  { id: "warranties", label: "Disclaimer of Warranties" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "termination", label: "Termination" },
  { id: "modifications", label: "Modifications" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact" },
];

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Please read these terms carefully before using cofr"
      lastUpdated={LAST_UPDATED}
      tldr={TLDR}
      toc={TOC}
    >
      <LegalSection id="acceptance" number="01" title="Acceptance of Terms">
        <p>
          By accessing or using cofr at cofr.cash (the "Service"), creating an account, or clicking
          "Create account," you agree to be bound by these Terms of Service ("Terms"). If you do not
          agree, do not use the Service.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you and Felix Hernandez Vieyra,
          the individual operator of cofr ("Operator," "we," "us," or "our").
        </p>
      </LegalSection>

      <LegalSection id="eligibility" number="02" title="Eligibility">
        <p>
          You may use the Service only if you have the legal capacity to form a binding contract
          under the laws applicable in your jurisdiction. By using the Service, you represent that
          you meet this requirement.
        </p>
        <p>
          The Service is not directed at, and should not be used by, anyone who lacks the legal
          capacity to enter into contracts in their jurisdiction. If you are using the Service on
          behalf of an organisation, you represent that you have authority to bind that organisation
          to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="account" number="03" title="Account Responsibilities">
        <p>
          You are responsible for maintaining the security of your account credentials. You agree to
          provide accurate, current, and complete information when registering. You must notify us
          immediately at me@felix-hzv.dev if you become aware of any unauthorised access to your
          account.
        </p>
        <p>
          You are solely responsible for all activity that occurs under your account. We are not
          liable for any loss or damage arising from your failure to maintain account security.
        </p>
        <p>
          You may not share your account with others or create accounts through automated means.
        </p>
      </LegalSection>

      <LegalSection id="license" number="04" title="License Grant">
        <p>
          Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
          non-transferable, revocable licence to access and use the hosted Service at cofr.cash for
          your personal, non-commercial finance tracking purposes.
        </p>
        <p>
          This licence does not include the right to resell the Service, use it to build a competing
          product, or sublicense access to third parties.
        </p>
      </LegalSection>

      <LegalSection id="prohibited" number="05" title="Prohibited Conduct">
        <p>You agree not to:</p>
        <ul className="ml-4 list-disc space-y-1.5 marker:opacity-50">
          <li>Scrape, crawl, or systematically extract data from the Service by automated means</li>
          <li>
            Attempt to reverse-engineer, decompile, or circumvent authentication or security
            mechanisms of the hosted Service
          </li>
          <li>Attempt to access another user's account or data</li>
          <li>
            Use the Service for any unlawful purpose, including financial crime or money laundering
          </li>
          <li>
            Introduce malware, viruses, or any code intended to disrupt, damage, or gain
            unauthorised access to any system
          </li>
          <li>Impersonate any person or entity, or misrepresent your affiliation</li>
          <li>Resell, sublicense, or commercially exploit access to the hosted Service</li>
          <li>Use the Service in any way that violates applicable law or regulation</li>
        </ul>
        <p>
          Violation of these prohibitions may result in immediate termination of your account
          without notice, and may be reported to relevant authorities where legally required.
        </p>
      </LegalSection>

      <LegalSection id="selfhost" number="06" title="Self-Hosting & Open Source">
        <p>
          The cofr codebase is released under the GNU Affero General Public Licence v3.0 (AGPL-3.0).
          You may self-host, modify, and distribute cofr in accordance with the terms of that
          licence.
        </p>
        <p>
          Self-hosted instances are entirely independent deployments. The Operator has no access to,
          control over, or responsibility for data processed on any self-hosted instance. These
          Terms of Service apply only to the hosted Service at cofr.cash.
        </p>
        <p>
          If you operate a self-hosted instance, you assume full responsibility for compliance with
          applicable data protection and privacy laws in your jurisdiction.
        </p>
        <p>
          These Terms do not govern your use of the open-source codebase. The AGPL-3.0 licence is
          the sole legal agreement covering rights to the source code. If you operate a self-hosted
          instance, you are solely responsible for your own data protection compliance, and the
          Operator bears no liability for your deployment.
        </p>
      </LegalSection>

      <LegalSection id="ip" number="07" title="Intellectual Property">
        <p>
          The cofr name, logo, visual design, and the hosted Service are the intellectual property
          of the Operator. Nothing in these Terms transfers any ownership right to you.
        </p>
        <p>
          Your financial data, transaction records, and personal information remain your property at
          all times. The Operator does not claim any intellectual property rights over your data.
        </p>
        <p>
          The underlying source code is separately licenced under AGPL-3.0, which grants specific
          rights and imposes specific obligations independent of these Terms.
        </p>
      </LegalSection>

      <LegalSection id="user-content" number="08" title="User Content">
        <p>
          You own all financial data, transactions, categories, and other content you input into the
          Service ("User Content"). By using the Service, you grant the Operator a limited,
          worldwide, royalty-free licence to store, process, and display your User Content solely to
          operate and provide the Service to you.
        </p>
        <p>
          We do not use your User Content for advertising, profiling, training machine learning
          models, or any purpose other than operating the Service. We do not sell or share your User
          Content with third parties except as described in our Privacy Policy.
        </p>
        <p>
          You represent that you have the right to input any content you upload to the Service and
          that doing so does not violate any applicable law or third-party rights.
        </p>
      </LegalSection>

      <LegalSection id="no-advice" number="09" title="No Financial Advice">
        <p>
          cofr is a personal finance tracking tool. Nothing in the Service, including account
          summaries, spending analysis, category breakdowns, or any other feature, constitutes
          financial, investment, tax, accounting, or legal advice.
        </p>
        <p>
          You should not rely on the Service as a substitute for advice from a qualified financial
          professional. All financial decisions are your own.
        </p>
      </LegalSection>

      <LegalSection id="warranties" number="10" title="Disclaimer of Warranties">
        <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS
          OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR DISCLAIMS ALL
          WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          In plain English: we make no promises about uptime, accuracy, or fitness for any
          particular use. The Service may be unavailable, contain errors, or change without notice.
        </p>
        <p>
          There is no Service Level Agreement (SLA). We do not guarantee continuous, uninterrupted,
          or error-free access to the Service. We may modify, suspend, or discontinue the Service at
          any time without liability to you.
        </p>
      </LegalSection>

      <LegalSection id="liability" number="11" title="Limitation of Liability">
        <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR'S TOTAL LIABILITY TO YOU
          FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE
          TOTAL AMOUNT YOU PAID TO USE THE SERVICE IN THE TWELVE MONTHS PRECEDING THE CLAIM. FOR
          USERS WHO HAVE PAID NOTHING (INCLUDING ALL FREE-TIER USERS), THIS LIMIT IS ZERO (NZD $0).
        </p>
        <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
          IN NO EVENT SHALL THE OPERATOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR LOSS OF
          GOODWILL, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY, EVEN IF ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          In plain English: if something goes wrong, the most we can owe you is what you paid us
          (which, for free users, is nothing). We are not responsible for indirect or consequential
          losses.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion or limitation of certain warranties or
          liability. In such jurisdictions, our liability is limited to the maximum extent permitted
          by law.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" number="12" title="Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless the Operator from and against any
          claims, damages, losses, costs, and expenses (including reasonable legal fees) arising
          from: (a) your use of the Service in violation of these Terms; (b) your User Content; or
          (c) your violation of any law or third-party right.
        </p>
      </LegalSection>

      <LegalSection id="termination" number="13" title="Termination">
        <p>
          <strong style={{ color: "var(--content-heading)" }}>By you:</strong> You may stop using
          the Service at any time. You may perform a soft delete (your account becomes inaccessible
          but data is retained until you log in again) or a hard delete from Settings → Danger Zone,
          which permanently removes your account, all transactions, and all associated data. Hard
          deletion is irreversible.
        </p>
        <p>
          <strong style={{ color: "var(--content-heading)" }}>By us:</strong> We may suspend or
          terminate your access to the Service at any time, with or without notice, if we reasonably
          believe you have violated these Terms, if required by law, or if we discontinue the
          Service.
        </p>
        <p>
          Upon termination, your licence to use the Service ends. Sections 7 (Intellectual
          Property), 9 (No Financial Advice), 10 (Disclaimer of Warranties), 11 (Limitation of
          Liability), 12 (Indemnification), and 15 (Governing Law) survive termination.
        </p>
      </LegalSection>

      <LegalSection id="modifications" number="14" title="Modifications to Terms">
        <p>
          We may update these Terms from time to time. When we do, we will update the "Last updated"
          date at the top of this page. For material changes, we will make reasonable efforts to
          notify you via the email address on your account.
        </p>
        <p>
          Your continued use of the Service after the effective date of updated Terms constitutes
          your acceptance of those changes. If you do not agree to the updated Terms, you should
          stop using the Service and delete your account.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" number="15" title="Governing Law & Disputes">
        <p>
          These Terms are governed by and construed in accordance with the laws of New Zealand,
          without regard to its conflict of law principles. The United Nations Convention on
          Contracts for the International Sale of Goods does not apply.
        </p>
        <p>
          Before initiating any formal dispute, you agree to first contact us at me@felix-hzv.dev
          and make a good-faith effort to resolve the matter informally. Most concerns can be
          resolved this way.
        </p>
        <p>
          If informal resolution fails, any dispute arising out of or relating to these Terms or the
          Service shall be subject to the exclusive jurisdiction of the courts of New Zealand.
        </p>
        <p>
          You waive any right to participate in a class-action lawsuit or class-wide arbitration
          against the Operator to the extent permitted by applicable law.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="16" title="Contact">
        <p>For questions about these Terms, legal notices, or to report a concern, contact:</p>
        <p>
          Felix Hernandez Vieyra
          <br />
          <a
            href="mailto:me@felix-hzv.dev"
            className="transition-colors"
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
        <p>Governing jurisdiction: New Zealand</p>
      </LegalSection>
    </LegalLayout>
  );
}
