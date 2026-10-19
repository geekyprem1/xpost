import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_CONTACT_EMAIL,
  LegalPage,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Shotlark",
  description: "How Shotlark collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information Shotlark (&quot;Shotlark&quot;,
        &quot;we&quot;, &quot;us&quot;) collects when you use our website and
        editor, how we use it, and the choices you have. By using Shotlark you
        agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <h3>Account information</h3>
      <p>
        You sign in with Google. Google shares your name, email address, and
        profile picture with us. We use them to create and identify your
        account. We do not receive your Google password.
      </p>

      <h3>Content you create</h3>
      <ul>
        <li>
          Projects you save, including editor settings and post text you write.
        </li>
        <li>Screenshots and images you upload to a saved project.</li>
        <li>
          Unsaved drafts are kept only in your browser&apos;s local storage on
          your device.
        </li>
      </ul>
      <p>
        Rendering and exporting happen in your browser. Downloading an image or
        video does not send it to our servers.
      </p>

      <h3>AI writing</h3>
      <p>
        When you ask the AI to write or refine a post, we send the current
        visual and your instructions to our AI provider to generate the text. We
        keep a record of each request (your instructions, the generated text,
        the model used, and usage counts) so we can show your history, enforce
        credit limits, and track costs. We do not store the image as part of
        that record.
      </p>

      <h3>X (Twitter) account</h3>
      <p>
        If you connect an X account, we store your X user ID, username, display
        name, profile picture, and the access tokens needed to post on your
        behalf. Tokens are stored encrypted. When you publish through Shotlark,
        we keep the post text, media type, status, and X post ID. We only post
        when you ask us to.
      </p>

      <h3>Stock media searches</h3>
      <p>
        When you search for stock photos or videos, your search terms are sent
        to Pexels or Pixabay. Results load directly from their servers, so those
        providers can see your IP address.
      </p>

      <h3>Usage and technical data</h3>
      <p>
        We keep credit balances, request counts used for rate limiting, and
        standard server logs (such as IP address, browser type, and error
        details) to run and secure the service.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We use cookies that are needed to keep you signed in and to complete
        sign-in securely. We store your theme preference and unsaved drafts in
        your browser. We do not use advertising cookies.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To provide the editor, save your projects, and sign you in.</li>
        <li>To generate AI text and publish to X when you request it.</li>
        <li>To enforce usage limits and prevent abuse.</li>
        <li>To fix bugs, keep the service secure, and improve it.</li>
        <li>To contact you about your account or important changes.</li>
      </ul>
      <p>We do not sell your personal information or use it for advertising.</p>

      <h2>Google user data</h2>
      <p>
        We only request basic Google profile information (name, email address,
        and profile picture) to sign you in. Shotlark&apos;s use of information
        received from Google APIs adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We do not use Google user data
        for advertising, do not sell it, and do not use it to train AI models.
      </p>

      <h2>Service providers</h2>
      <p>
        We share information only with providers that help us run Shotlark, and
        only as needed for the purposes above:
      </p>
      <ul>
        <li>Supabase: authentication, database, and file storage.</li>
        <li>Vercel: website hosting.</li>
        <li>Google: sign-in.</li>
        <li>
          OpenRouter and the AI model providers it routes to: generating post
          text.
        </li>
        <li>Pexels and Pixabay: stock media search.</li>
        <li>X: publishing posts you choose to share.</li>
      </ul>
      <p>
        We may also disclose information if required by law or to protect the
        rights and safety of our users or the service.
      </p>

      <h2>Data retention</h2>
      <ul>
        <li>
          Account data, projects, and uploads are kept while your account is
          active.
        </li>
        <li>
          Uploaded files that are no longer attached to a project are deleted
          after 30 days.
        </li>
        <li>
          Files prepared for posting to X are deleted right after posting, or
          within 24 hours if posting does not finish.
        </li>
        <li>Cached stock media search results are kept for up to 24 hours.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        You can delete your account at any time from the{" "}
        <Link href="/account">Account</Link> page. This permanently removes your
        profile, projects, uploaded files, AI history, and connected X account
        details from our systems. Copies in backups are removed as backups
        expire. You can also revoke Shotlark&apos;s access from your{" "}
        <a
          href="https://myaccount.google.com/connections"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google account settings
        </a>
        .
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections, access controls that limit each user to
        their own data, and encryption for X access tokens. No system is
        perfectly secure, but we work to protect your information.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct,
        export, or delete your personal information, or to object to certain
        uses. Contact us and we will respond within a reasonable time.
      </p>

      <h2>Children</h2>
      <p>
        Shotlark is not intended for children under 13, or under the minimum age
        required in your country. We do not knowingly collect information from
        them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy. If changes are significant, we will let you
        know through the app or by email. The effective date above shows when it
        last changed.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
