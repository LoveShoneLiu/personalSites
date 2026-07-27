/** 文件职责：公开展示 Receiptly 隐私政策，供用户和 App Store 审核访问。 */
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './privacy.module.scss';

export const metadata: Metadata = {
  title: 'Receiptly Privacy Policy',
  description: 'Privacy Policy for the Receiptly household receipt and expense tracking app.',
  alternates: { canonical: '/receiptly/privacy' },
};

const contactEmail = 'isshaofeiliu@gmail.com';

const PrivacyPage = () => (
  <article className={styles.page}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>RECEIPTLY</p>
      <h1>Privacy Policy</h1>
      <p className={styles.intro}>
        This policy explains how Receiptly collects, uses, shares, retains, and deletes information
        when you use the Receiptly mobile application and related services.
      </p>
      <p className={styles.updated}>Effective and last updated: 27 July 2026</p>
    </header>

    <nav className={styles.summary} aria-label="Privacy policy summary">
      <h2>At a glance</h2>
      <ul>
        <li>Receiptly uses your information to provide login, household sharing, and expense records.</li>
        <li>Receipt images are processed for recognition and are not stored by Receiptly after the request.</li>
        <li>Receiptly does not sell personal information or use it for third-party advertising.</li>
        <li>You can request account deletion directly inside the Receiptly app.</li>
      </ul>
    </nav>

    <section>
      <h2>1. Who operates Receiptly</h2>
      <p>
        Receiptly is operated by Shaofei Liu in New Zealand. For privacy questions or requests,
        contact
        {' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        .
      </p>
    </section>

    <section>
      <h2>2. Information we collect</h2>
      <h3>Account and contact information</h3>
      <p>
        We collect your email address, display name if supplied, encrypted authentication records,
        and information needed to maintain your login sessions. Passwords are not stored in plain
        text; Receiptly stores a one-way password hash.
      </p>
      <h3>Receipt and household expense information</h3>
      <p>
        We collect receipt details that you scan, review, or confirm, including merchant name,
        purchase date, receipt number, currency, totals, product names, quantities, prices, and
        adjustments. Confirmed records are associated with your household so authorised household
        members can view the shared household ledger.
      </p>
      <h3>Receipt images</h3>
      <p>
        When you choose or capture a receipt image, Receiptly sends the image to its server and to
        its artificial-intelligence processing provider, OpenRouter, to extract receipt data. The
        current Receiptly service processes the image in memory and does not save the original image
        to the Receiptly database or permanent Receiptly storage. You should review extracted data
        before confirming it.
      </p>
      <h3>Household and invitation information</h3>
      <p>
        We collect household names, membership roles, member email addresses, and invitation
        status so users can create a household and invite or manage household members.
      </p>
      <h3>Device, security, and usage information</h3>
      <p>
        We process an app installation identifier, device name, platform, session timestamps,
        security events, IP address, and basic request diagnostics to authenticate users, prevent
        abuse, diagnose failures, and protect the service. The website hosting Receiptly services
        may also collect aggregated usage and performance information.
      </p>
    </section>

    <section>
      <h2>3. How we use information</h2>
      <ul>
        <li>Register accounts, verify email addresses, and authenticate users.</li>
        <li>Scan receipts and return structured candidates for your review.</li>
        <li>Store confirmed expense records and make them available to authorised household members.</li>
        <li>Send login codes, security messages, and household invitations.</li>
        <li>Prevent duplicate submissions, fraud, abuse, and unauthorised access.</li>
        <li>Operate, troubleshoot, secure, and improve Receiptly.</li>
        <li>Comply with applicable legal obligations and enforce our rights.</li>
      </ul>
      <p>Receiptly does not sell personal information and does not use it for third-party advertising.</p>
    </section>

    <section>
      <h2>4. Service providers and disclosure</h2>
      <p>Receiptly uses service providers that process information only to provide their services:</p>
      <ul>
        <li>
          <strong>Neon:</strong>
          {' '}
          hosted database services for accounts, households, and receipt records.
        </li>
        <li>
          <strong>Vercel:</strong>
          {' '}
          application hosting, delivery, operational logs, and performance services.
        </li>
        <li>
          <strong>OpenRouter:</strong>
          {' '}
          artificial-intelligence processing of receipt images and text.
        </li>
        <li>
          <strong>Resend:</strong>
          {' '}
          delivery of verification codes and household invitation emails.
        </li>
      </ul>
      <p>
        These providers may process information in countries outside New Zealand, including the
        United States. We may also disclose information when required by law, to protect users or
        the service, or as part of a business reorganisation subject to appropriate safeguards.
      </p>
    </section>

    <section>
      <h2>5. Household sharing</h2>
      <p>
        Receiptly is a household product. Confirmed receipts and expense records can be viewed by
        active members of the same household. A household owner can invite and remove members.
        Removed members immediately lose access, but expense records previously contributed to the
        shared household ledger may remain available to the household.
      </p>
    </section>

    <section>
      <h2>6. Retention and deletion</h2>
      <p>
        We retain account and confirmed expense information while your account or household remains
        active, and for only as long as reasonably necessary to provide and secure Receiptly or meet
        legal obligations.
      </p>
      <p>
        You can initiate deletion from the Receiptly app under
        {' '}
        <strong>My Account → Delete Account</strong>
        . Deletion revokes active sessions, removes authentication identities, and anonymises the
        account. If you are the only member of a household you own, that household and its receipt
        data are deleted. If other members remain, Receiptly will require the household ownership
        issue to be resolved before account deletion. Shared records contributed as a non-owner may
        remain in the household ledger, but your account identifiers are removed.
      </p>
      <p>
        Some minimal security or legal records may be retained where required by law or necessary
        to establish, exercise, or defend legal claims.
      </p>
    </section>

    <section>
      <h2>7. Security</h2>
      <p>
        Receiptly uses access controls, short-lived access tokens, revocable sessions, password
        hashing, encrypted transport, and household membership checks. No system is completely
        secure, so please protect your device and login credentials and contact us if you suspect
        unauthorised access.
      </p>
    </section>

    <section>
      <h2>8. Your choices and rights</h2>
      <p>
        Depending on applicable law, you may request access to or correction or deletion of your
        personal information. You can delete your account in the app or contact
        {' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        . We may need to verify your identity before fulfilling a request.
      </p>
    </section>

    <section>
      <h2>9. Children</h2>
      <p>
        Receiptly is not directed to children under 13, and we do not knowingly collect personal
        information from children under 13. Contact us if you believe a child has provided personal
        information.
      </p>
    </section>

    <section>
      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy as Receiptly changes. We will publish the revised policy on this
        page and update the effective date. Material changes may also be communicated in the app.
      </p>
    </section>

    <footer className={styles.policyFooter}>
      <p>
        Questions?
        {' '}
        <a href={`mailto:${contactEmail}`}>Contact Receiptly privacy support</a>
        .
      </p>
      <Link href="/">Return to liushaofei.cn</Link>
    </footer>
  </article>
);

export default PrivacyPage;
