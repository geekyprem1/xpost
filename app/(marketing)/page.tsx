import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  Palette,
  Send,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { ProductShowcase } from "@/components/marketing/product-showcase";

export const metadata: Metadata = {
  title: "Shotlark — From screenshot to scroll-stopping post",
  description:
    "Beautify screenshots, write the post with AI, and share to X — all in one place. Free during beta.",
};

const PILLARS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Palette,
    title: "Beautify",
    body: "Gradients, motion backgrounds, real device frames, glass styles and sunlight effects. Your screenshot, made premium.",
  },
  {
    icon: WandSparkles,
    title: "Write",
    body: "AI looks at your visual and drafts the post. Refine it in one click — sharper hook, clearer CTA, the right tone.",
  },
  {
    icon: Send,
    title: "Share",
    body: "Copy the image, open X with your text ready, or download in the format you need. No app switching.",
  },
];

const STEPS = [
  { title: "Drop a screenshot", body: "Paste, drag, or capture your screen right in the browser." },
  { title: "Pick a look", body: "One tap for a background, frame and style — or let Auto choose." },
  { title: "Post it", body: "Generate the caption, export, and share to X." },
];

const FORMATS = ["PNG", "JPG", "WebP", "GIF", "MP4"];

const FAQ = [
  {
    q: "Is Shotlark free?",
    a: "Yes. During the beta every editor feature is unlocked. AI writing includes 30 credits a month.",
  },
  {
    q: "Do I need design skills?",
    a: "No. Presets and Auto style give you a polished result in seconds, and every detail stays adjustable.",
  },
  {
    q: "Where are my screenshots processed?",
    a: "Rendering happens in your browser. Images are only sent to the AI when you ask it to write a post.",
  },
  {
    q: "Can I remove the watermark?",
    a: "Yes — the Shotlark badge is on by default and you can switch it off before downloading.",
  },
];

const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both";

export default function Home() {
  return (
    <div className="bg-background text-foreground flex min-h-full flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-20 pb-12 text-center sm:pt-28">
          <p className={`${reveal} text-primary text-sm font-medium`}>Free during beta</p>
          <h1
            className={`${reveal} mx-auto mt-4 max-w-4xl text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-7xl motion-safe:delay-75`}
          >
            From screenshot to scroll-stopping post.
          </h1>
          <p
            className={`${reveal} text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl motion-safe:delay-150`}
          >
            Beautify the visual, write the caption with AI, and share to X — all in one place.
          </p>
          <div
            className={`${reveal} mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row motion-safe:delay-200`}
          >
            <PrimaryCta />
            <Link
              href="#how"
              className="text-primary inline-flex min-h-11 items-center gap-1 rounded-full px-5 text-base font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              See how it works
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        <section className={`${reveal} px-4 pb-24 sm:px-6 motion-safe:delay-300`}>
          <ProductShowcase />
        </section>

        {/* Pillars */}
        <section id="features" className="scroll-mt-20 px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="One tool, not three"
              title="Everything a great post needs."
              body="Stop bouncing between a design app, a chatbot and X."
            />
            <div className="mt-16 grid gap-5 md:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="bg-card border-border/60 rounded-3xl border p-8 sm:p-10"
                >
                  <span className="bg-secondary text-secondary-foreground inline-flex size-12 items-center justify-center rounded-2xl">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h3>
                  <p className="text-muted-foreground mt-3 leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Visual feature: frames + motion */}
        <section className="px-6 pb-24 sm:pb-32">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
            <article className="bg-card border-border/60 flex flex-col overflow-hidden rounded-3xl border">
              <div className="p-8 sm:p-10">
                <h3 className="text-2xl font-semibold tracking-tight">Real device frames.</h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  iPhone, iPad and MacBook mockups that look like the real hardware.
                </p>
              </div>
              <div className="relative mt-auto h-72 sm:h-80">
                <div className="absolute top-0 left-1/2 w-[200px] -translate-x-1/2 sm:w-[220px]">
                  <div className="relative aspect-[1379/2756]">
                    {/* Screen content sits under the frame's transparent opening */}
                    <div
                      className="absolute flex flex-col items-center justify-start overflow-hidden rounded-[13%/6.5%] pt-[24%] bg-[radial-gradient(90%_60%_at_20%_15%,#b4a6f4_0%,transparent_60%),radial-gradient(80%_60%_at_85%_40%,#ff9ec7_0%,transparent_55%),linear-gradient(180deg,#6650d8,#2a1f63)]"
                      style={{ left: "7.25%", top: "3.63%", width: "85.5%", height: "92.74%" }}
                    >
                      <div className="w-[78%] rounded-2xl bg-white p-3 shadow-[0_20px_40px_-12px_rgba(20,10,60,0.6)]">
                        <div className="flex items-center gap-2">
                          <span className="size-5 rounded-full bg-[#b4a6f4]" />
                          <span className="h-1.5 w-14 rounded-full bg-[#242334]" />
                        </div>
                        <span className="mt-3 block h-1.5 w-full rounded-full bg-[#ded8eb]" />
                        <span className="mt-1.5 block h-1.5 w-3/4 rounded-full bg-[#ded8eb]" />
                        <div className="mt-3 flex h-14 items-end gap-1.5 rounded-xl bg-[#f0ecfc] p-2">
                          {[45, 70, 55, 90, 65].map((height, index) => (
                            <span
                              key={index}
                              className="flex-1 rounded-t-sm bg-[#b4a6f4]"
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Image
                      src="/frames/iphone-17.png"
                      alt="Screenshot shown inside an iPhone device frame"
                      fill
                      sizes="220px"
                      className="pointer-events-none select-none object-contain"
                    />
                  </div>
                </div>
              </div>
            </article>
            <article className="bg-card border-border/60 flex flex-col overflow-hidden rounded-3xl border">
              <div className="p-8 sm:p-10">
                <h3 className="text-2xl font-semibold tracking-tight">Backgrounds that move.</h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Export motion backgrounds as MP4 or GIF — made to stop the scroll.
                </p>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3 px-8 pb-8 sm:px-10 sm:pb-10">
                {["loop-07", "loop-09", "loop-02", "loop-03"].map((name) => (
                  <Image
                    key={name}
                    src={`/motion/${name}.webp`}
                    alt=""
                    width={480}
                    height={270}
                    sizes="(min-width: 768px) 260px, 45vw"
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-muted/40 scroll-mt-20 px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="How it works" title="Three steps. Under a minute." />
            <ol className="mt-16 grid gap-10 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="text-primary text-sm font-semibold tabular-nums">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="text-muted-foreground mt-2 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Formats */}
        <section className="px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <Download className="text-primary mx-auto size-8" aria-hidden />
            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
              Export the way X likes it.
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
              Up to 3× resolution, with a built-in check against X&apos;s upload limits.
            </p>
            <ul className="mt-10 flex flex-wrap justify-center gap-3" aria-label="Export formats">
              {FORMATS.map((format) => (
                <li
                  key={format}
                  className="border-border/70 rounded-full border px-5 py-2 text-sm font-medium"
                >
                  {format}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-6 pb-24 sm:pb-32">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-4xl font-semibold tracking-[-0.03em]">Questions.</h2>
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
                  <p className="text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-28 sm:pb-36">
          <div className="mx-auto max-w-4xl text-center">
            <Sparkles className="text-primary mx-auto size-8" aria-hidden />
            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-6xl">
              Your next post starts with a screenshot.
            </h2>
            <div className="mt-10 flex justify-center">
              <PrimaryCta />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function PrimaryCta() {
  return (
    <Link
      href="/editor"
      className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex min-h-12 items-center justify-center rounded-full px-7 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Start creating — it&apos;s free
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-primary text-sm font-medium">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
        {title}
      </h2>
      {body ? <p className="text-muted-foreground mt-4 text-lg">{body}</p> : null}
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="bg-background/75 border-border/50 sticky top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-full px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6"
      >
        <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold">
          <Image
            src="/logos/shotlark-flight.svg"
            alt=""
            width={28}
            height={28}
            className="rounded-lg bg-[#f0ecfc] p-0.5"
          />
          Shotlark
        </Link>
        <div className="flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="#features"
            className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center px-3 transition-colors sm:inline-flex"
          >
            Features
          </Link>
          <Link
            href="#how"
            className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center px-3 transition-colors sm:inline-flex"
          >
            How it works
          </Link>
          <Link
            href="#faq"
            className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center px-3 transition-colors sm:inline-flex"
          >
            FAQ
          </Link>
          <Link
            href="/editor"
            className="bg-foreground text-background ml-2 inline-flex min-h-9 items-center rounded-full px-4 font-medium transition-opacity hover:opacity-85"
          >
            Open editor
          </Link>
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-border/50 border-t px-6 py-10">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <p>© Shotlark</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
