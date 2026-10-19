import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/** Floating pill navigation used on the landing page. */
export function SiteNav() {
  return (
    <header className="sticky top-3 z-50 flex justify-center gap-2 px-4 pt-3 sm:top-4">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-full px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="pill-surface flex h-14 items-center gap-1 rounded-full py-1.5 pr-1.5 pl-2"
      >
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-full pr-3 pl-1 font-semibold"
        >
          <Image
            src="/logos/shotlark-flight.svg"
            alt=""
            width={32}
            height={32}
            className="rounded-[10px] bg-[#f0ecfc] p-0.5"
          />
          Shotlark
        </Link>
        <Link
          href="#looks"
          className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center px-3 text-sm transition-colors sm:inline-flex"
        >
          Looks
        </Link>
        <Link
          href="#features"
          className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center px-3 text-sm transition-colors sm:inline-flex"
        >
          Features
        </Link>
        <Link
          href="#faq"
          className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center px-3 text-sm transition-colors md:inline-flex"
        >
          FAQ
        </Link>
        <Link
          href="/editor"
          className="bg-foreground text-background ml-1 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-85"
        >
          Create
        </Link>
      </nav>
      <div className="pill-surface flex size-14 items-center justify-center rounded-full [&_button]:size-11 [&_button]:rounded-full">
        <ThemeToggle />
      </div>
    </header>
  );
}
