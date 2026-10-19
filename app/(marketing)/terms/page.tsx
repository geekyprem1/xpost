import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_CONTACT_EMAIL,
  LegalPage,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Shotlark",
  description: "The terms that apply when you use Shotlark.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern your use of Shotlark (&quot;Shotlark&quot;,
        &quot;we&quot;, &quot;us&quot;). By creating an account or using the
        service, you agree to them. If you do not agree, do not use Shotlark.
      </p>

      <h2>The service</h2>
      <p>
        Shotlark lets you style screenshots, write posts with AI, export images
        and videos, and share to X. Shotlark is currently in beta. Features,
        limits, and availability may change, and we may add paid plans in the
        future. We will tell you before charging for anything.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You sign in with a Google account that belongs to you.</li>
        <li>
          You must be at least 13 years old, or the minimum age required in your
          country.
        </li>
        <li>
          You are responsible for activity on your account. Tell us if you
          believe it has been accessed without permission.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of the screenshots, text, and other content you
        create or upload. You give us a limited permission to store, process,
        and display that content only as needed to run the service for you,
        including sending it to our AI provider when you use AI features and to
        X when you choose to post.
      </p>
      <p>
        You confirm that you have the rights to the content you upload and post,
        and that it does not violate anyone else&apos;s rights or the law.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Upload or post content that is illegal, infringing, harassing,
          hateful, sexually explicit, or misleading.
        </li>
        <li>
          Use Shotlark to send spam or to break X&apos;s rules and policies.
        </li>
        <li>
          Try to get around usage limits, access other users&apos; data, or
          disrupt or reverse engineer the service.
        </li>
        <li>Use automated scripts to access the service.</li>
      </ul>

      <h2>AI-generated text</h2>
      <p>
        AI suggestions can be inaccurate or unsuitable. Review every post before
        you publish it. You are responsible for what you post.
      </p>

      <h2>X integration</h2>
      <p>
        If you connect an X account, Shotlark posts only when you ask it to.
        Your use of X is also subject to X&apos;s own terms. You can disconnect
        your X account at any time. X may limit or reject posts, and we are not
        responsible for X&apos;s decisions or outages.
      </p>

      <h2>Credits and limits</h2>
      <p>
        AI features use monthly credits, and posting to X has monthly limits.
        Credits reset each usage period, have no cash value, and cannot be
        transferred. We may adjust limits to keep the service fair and
        sustainable.
      </p>

      <h2>Third-party media and assets</h2>
      <p>
        Stock photos and videos come from Pexels and Pixabay and are subject to
        their licenses. Device frames and other built-in assets are provided for
        use in content you create with Shotlark.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Shotlark and delete your account at any time from the{" "}
        <Link href="/account">Account</Link> page. We may suspend or close
        accounts that break these terms or put the service or other users at
        risk.
      </p>

      <h2>Disclaimers</h2>
      <p>
        Shotlark is provided &quot;as is&quot; and &quot;as available&quot;,
        without warranties of any kind, to the extent the law allows. We do not
        guarantee that the service will be uninterrupted, error-free, or that
        saved data will never be lost. Keep your own copies of important work.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, Shotlark is not liable for indirect,
        incidental, or consequential damages, or for lost profits, data, or
        goodwill. Our total liability for any claim related to the service is
        limited to the amount you paid us in the 12 months before the claim, or
        USD 50 if you have not paid us anything.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. If changes are significant, we will let you
        know through the app or by email. Continuing to use Shotlark after
        changes take effect means you accept the updated terms.
      </p>

      <h2>Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains how we handle
        your information.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
