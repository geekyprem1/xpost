import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  LEGAL_CONTACT_EMAIL,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Contact & support — Shotlark",
  description:
    "Contact Shotlark about your editor, AI credits, payment or refund request.",
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact & support">
      <p>
        Shotlark is a browser-based screenshot editor with device frames,
        backgrounds, image and video exports, and AI-assisted post writing.
      </p>
      <h2>Get in touch</h2>
      <p>
        For product help, billing questions, refunds or privacy requests, email{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
      <p>
        For purchase questions, include the email used at checkout, your order
        or payment reference, and a description of the issue. Do not send
        passwords, payment card numbers or API keys.
      </p>
      <h2>Digital delivery</h2>
      <p>
        Shotlark is delivered online. After Dodo Payments confirms a successful
        purchase, Lifetime Editor access or credit top-ups are applied
        automatically to the Shotlark account used to start checkout. No
        physical goods are shipped.
      </p>
      <p>
        The account page shows payment confirmation and your current credits. If
        a purchase has not appeared, refresh payment status on the{" "}
        <Link href="/account">Account page</Link> and contact support with the
        payment reference.
      </p>
      <h2>Plans and policies</h2>
      <p>
        See <Link href="/pricing">Pricing</Link> for the current one-time
        offers,{" "}
        <Link href="/terms#payments-and-refunds">Payments and refunds</Link> for
        refund requests and cancellation information, and our{" "}
        <Link href="/privacy">Privacy Policy</Link> for how we handle your data.
      </p>
    </LegalPage>
  );
}
