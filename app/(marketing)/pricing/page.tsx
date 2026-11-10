import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/pricing";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
export const metadata: Metadata = {
  title: "Pricing — Shotlark",
  description:
    "Try Shotlark free. Own Lifetime Editor for $9.99 with 100 AI credits. No subscription.",
};
export default function PricingPage() {
  return (
    <main id="main" className="bg-background text-foreground min-h-dvh">
      <SiteNav />
      <Pricing heading="h1" />
      <SiteFooter />
    </main>
  );
}
