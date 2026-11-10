import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "./site-footer";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/site-details";

/** Single place to change the legal contact address and effective date. */
export { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE } from "@/lib/site-details";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border/50 border-b">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6"
        >
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 font-semibold"
          >
            <Image
              src="/logos/shotlark-flight.svg"
              alt=""
              width={28}
              height={28}
              className="rounded-lg bg-[#f0ecfc] p-0.5"
            />
            Shotlark
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center px-3 text-sm transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1 px-6 py-16 sm:py-20">
        <article className="[&_a]:text-primary mx-auto max-w-3xl leading-relaxed [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:text-pretty [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Effective {LEGAL_EFFECTIVE_DATE}
          </p>
          {children}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
