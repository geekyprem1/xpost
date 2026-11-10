import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/site-details";

export function SiteFooter() {
  return (
    <footer className="border-border/50 border-t px-6 py-8">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm lg:flex-row">
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-5 gap-y-1"
        >
          {[
            ["/pricing", "Pricing"],
            ["/terms", "Terms"],
            ["/privacy", "Privacy"],
            ["/terms#payments-and-refunds", "Refunds & cancellation"],
            ["/contact", "Contact"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <a
          href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
        >
          {LEGAL_CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
