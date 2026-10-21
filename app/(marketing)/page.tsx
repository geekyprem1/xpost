import type { Metadata } from "next";
import Link from "next/link";
import { Palette, Send, WandSparkles, type LucideIcon } from "lucide-react";
import { AnimatedTiles } from "@/components/marketing/animated-tiles";
import { HeroDropzone } from "@/components/marketing/hero-dropzone";
import { HeroHeadline } from "@/components/marketing/hero-headline";
import { LEGAL_CONTACT_EMAIL } from "@/components/marketing/legal-page";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Shotlark — Screenshot mockups and AI posts for X",
  description:
    "Drop a screenshot, pick a look, and let AI write the post. Device mockups, motion backgrounds, and one-click sharing to X. Free during beta.",
};

const PILLARS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Palette,
    title: "Style it",
    body: "Real device frames, mesh and motion backgrounds, glass styles and sunlight. Every detail stays adjustable.",
  },
  {
    icon: WandSparkles,
    title: "Write it",
    body: "AI looks at your visual and drafts the post. Sharpen the hook or change the tone in one click.",
  },
  {
    icon: Send,
    title: "Share it",
    body: "Export PNG, JPG, WebP, GIF or MP4 at up to 3×, or open X with your post ready to go.",
  },
];

const FAQ = [
  {
    q: "Is Shotlark free?",
    a: "Yes. During the beta every editor feature is unlocked, and AI writing includes 30 credits a month.",
  },
  {
    q: "Where are my screenshots processed?",
    a: "Rendering happens in your browser. Images are only sent to the AI when you ask it to write a post.",
  },
  {
    q: "Can I remove the watermark?",
    a: "Yes. The Shotlark badge is on by default and you can switch it off before downloading.",
  },
];

const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both";

export default function Home() {
  return (
    <div className="bg-background text-foreground relative isolate flex min-h-full flex-col">
      <AnimatedTiles />
      <SiteNav />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-16 pb-24 text-center sm:pt-24 sm:pb-32">
          <HeroHeadline />
          <p
            className={`${reveal} text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty motion-safe:delay-[650ms]`}
          >
            Drop a screenshot, pick a look, and let AI write the post. Ready for
            X in under a minute.
          </p>
          <div className={`${reveal} mt-12 motion-safe:delay-[800ms]`}>
            <HeroDropzone />
          </div>
          <p
            className={`${reveal} text-muted-foreground mt-6 text-sm motion-safe:delay-[950ms]`}
          >
            Free during beta · Sign in with Google · Rendered in your browser
          </p>
        </section>

        {/* Statement: the quiet line sets up, the loud one answers. */}
        <section className="px-6 pt-4 pb-28 text-center sm:pt-8 sm:pb-40">
          <h2 className="mx-auto max-w-5xl font-bold text-balance">
            <span className="text-muted-solid block text-2xl leading-snug font-semibold tracking-[-0.03em] sm:text-4xl">
              Most screenshots get scrolled past.
            </span>
            <span className="mt-2 block text-5xl leading-[0.95] tracking-[-0.055em] sm:mt-3 sm:text-8xl lg:text-9xl">
              Yours won’t.
            </span>
          </h2>
        </section>

        {/* Features */}
        <section
          id="features"
          className="bg-muted/40 scroll-mt-24 px-6 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              title="More than a mockup."
              muted="The whole post."
              body="Stop bouncing between a design app, a chatbot and X."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="bg-card border-foreground/5 rounded-3xl border p-8"
                >
                  <span className="bg-foreground text-background inline-flex size-12 items-center justify-center rounded-2xl">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-4xl font-bold tracking-[-0.04em]">
              Questions.
            </h2>
            <div className="divide-border/70 border-border/70 mt-12 divide-y border-y">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-6">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      className="text-muted-foreground text-2xl leading-none transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-muted-foreground mt-3 leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
            <div className="mt-16 flex justify-center">
              <Link
                href="/editor"
                className="bg-foreground text-background inline-flex min-h-12 items-center rounded-full px-7 text-base font-semibold transition-opacity hover:opacity-85"
              >
                Start creating, it&apos;s free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({
  title,
  muted,
  body,
}: {
  title: string;
  muted: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-4xl leading-[1.05] font-bold tracking-[-0.045em] text-balance sm:text-6xl">
        {title}
        <span className="text-muted-solid block">{muted}</span>
      </h2>
      {body ? (
        <p className="text-muted-foreground mt-4 text-base sm:text-lg">
          {body}
        </p>
      ) : null}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-border/50 border-t px-6 py-10">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/login"
            className="hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </nav>
        <a
          href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          className="hover:text-foreground transition-colors"
        >
          {LEGAL_CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
