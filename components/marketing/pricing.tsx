import Link from "next/link";
import { Check, Sparkles, Zap } from "lucide-react";
import { BILLING_PRODUCTS } from "@/lib/billing/catalog";
import { CheckoutButton } from "@/components/billing/checkout-button";

function Features({ items }: { items: string[] }) {
  return (
    <ul className="space-y-4 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Check className="mt-0.5 size-4 shrink-0 opacity-70" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Pricing({
  heading: Heading = "h2",
}: {
  heading?: "h1" | "h2";
}) {
  return (
    <section id="pricing" className="scroll-mt-24 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Simple one-time pricing
          </p>
          <Heading className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
            A plan for every screenshot.
          </Heading>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl leading-relaxed">
            Start free, own the complete editor with one payment, then top up AI
            credits when you need them.
          </p>
        </div>
        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
          <article className="bg-card rounded-3xl border p-6 shadow-sm md:my-3">
            <h3 className="text-lg font-medium">Free trial</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Try the workflow
            </p>
            <p className="mt-7 text-5xl font-semibold tracking-tight">
              $0
              <span className="text-muted-foreground ml-2 text-xs font-normal tracking-normal">
                to start
              </span>
            </p>
            <Link
              href="/editor"
              className="bg-muted hover:bg-muted/70 mt-7 flex min-h-11 items-center justify-center rounded-xl border text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Try Shotlark
            </Link>
            <div className="text-muted-foreground mt-6 border-t pt-6">
              <Features
                items={[
                  "24 hours of the full editor, no card needed",
                  "5 starting AI credits",
                  "After 24 hours: basic editor with watermarked exports",
                ]}
              />
            </div>
          </article>
          <article className="relative overflow-hidden rounded-3xl border border-[#49444f] bg-[#211f27] p-6 text-[#f6f3fa] shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">Lifetime Editor</h3>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
                Best value
              </span>
            </div>
            <p className="mt-1 text-sm text-[#c9c3d1]">
              One payment, yours forever
            </p>
            <div className="relative mt-6 grid grid-cols-[1.3fr_1fr] overflow-hidden rounded-2xl border border-[#b4a6f4]/40">
              <div className="bg-[#302a40] px-4 py-6">
                <span className="text-xs font-medium tracking-widest text-[#d9cef9] uppercase">
                  Lifetime
                </span>
                <p className="mt-2 text-5xl font-semibold tracking-[-0.06em]">
                  $9.99
                </p>
                <p className="mt-3 text-xs text-[#c9c3d1]">
                  once · no subscription
                </p>
              </div>
              <div className="flex flex-col items-center justify-center border-l border-dashed border-[#211f27]/30 bg-[#b4a6f4] p-3 text-[#211f27]">
                <span className="text-[10px] font-bold tracking-widest uppercase">
                  Included
                </span>
                <strong className="mt-3 text-3xl tracking-tight">+100</strong>
                <span className="text-xs">AI credits</span>
              </div>
            </div>
            <div className="mt-5">
              <CheckoutButton product="lifetime" featured>
                <Sparkles className="size-4" aria-hidden />
                Buy Lifetime Editor
              </CheckoutButton>
            </div>
            <div className="mt-8 text-[#d6d0df]">
              <Features
                items={[
                  "Own the editor forever",
                  "Photo backgrounds and every frame",
                  "Motion backgrounds with GIF and video export",
                  "100 AI credits included",
                  "Clean high-resolution exports",
                ]}
              />
            </div>
          </article>
          <article className="bg-card rounded-3xl border p-6 shadow-sm md:my-3">
            <h3 className="text-lg font-medium">AI credits</h3>
            <p className="text-muted-foreground mt-1 text-sm">Top up anytime</p>
            <div className="mt-5 space-y-3">
              {(["credits100", "credits500"] as const).map((key) => (
                <div key={key} className="bg-muted/20 rounded-2xl border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-xl">
                        {BILLING_PRODUCTS[key].credits}
                      </strong>
                      <p className="text-muted-foreground text-xs">
                        AI credits
                      </p>
                    </div>
                    <strong className="text-2xl tracking-tight">
                      ${(BILLING_PRODUCTS[key].priceCents / 100).toFixed(2)}
                    </strong>
                  </div>
                  <CheckoutButton product={key}>
                    <Zap className="size-4" aria-hidden />
                    Buy credits
                  </CheckoutButton>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground mt-6 border-t pt-6">
              <Features
                items={[
                  "Credits never expire",
                  "1 generation = 1 credit",
                  "1 AI refinement = 1 credit",
                  "Failed requests are refunded",
                ]}
              />
            </div>
          </article>
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
          Prices in USD, tax-inclusive. Dodo Payments shows your final checkout
          total. Sign in to purchase. Credit packs do not unlock the Lifetime
          Editor.
        </p>
      </div>
    </section>
  );
}
