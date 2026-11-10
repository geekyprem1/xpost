"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useBillingStore } from "@/lib/billing/access-store";
import { useCreditsStore } from "@/lib/store/credits-store";
import { Button } from "@/components/ui/button";
import type { BillingProfile } from "@/lib/billing/catalog";

export function AccountBilling() {
  const pro = useBillingStore((state) => state.pro);
  const [message, setMessage] = useState("Loading your plan…");
  const [access, setAccess] = useState<{
    lifetime: boolean;
    pro: boolean;
    trialEndsAt: number | null;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [debt, setDebt] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order");
    const url = order
      ? `/api/billing/status?order=${encodeURIComponent(order)}`
      : "/api/billing/status";
    async function update() {
      try {
        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        if (!response.ok)
          throw new Error(data.error ?? "Unable to check your plan.");
        const profile = data.profile as BillingProfile & {
          ai_credits: number;
          credit_debt: number;
        };
        useBillingStore.getState().setProfile(profile);
        useCreditsStore.getState().setCredits(profile.ai_credits);
        setAccess(data.access);
        setDebt(profile.credit_debt);
        if (data.order?.status === "pending") {
          setMessage(
            "Payment is awaiting confirmation. Your purchase appears here after it is confirmed.",
          );
          if (++checks < 30) timer = setTimeout(() => void update(), 2000);
        } else if (data.order?.status === "paid")
          setMessage("Payment confirmed. Your purchase is ready.");
        else if (
          data.order?.status === "refunded" ||
          data.order?.status === "partially_refunded"
        )
          setMessage(
            "Your payment has been refunded. Your balance and editor access have been updated.",
          );
        else
          setMessage(
            "AI credits never expire. Each generation or refinement uses 1 credit.",
          );
      } catch (error) {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to check your plan.",
          );
      }
    }
    void update();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [retry]);
  return (
    <section className="rounded-xl border p-4" aria-label="Plan and billing">
      <h2 className="font-semibold">
        {access?.lifetime
          ? "Lifetime Editor"
          : pro
            ? "Full editor trial"
            : "Basic editor"}
      </h2>
      {pro && access && !access.lifetime && access.trialEndsAt ? (
        <p className="text-muted-foreground mt-1 text-sm">
          Trial ends {new Date(access.trialEndsAt).toLocaleString()}.
        </p>
      ) : null}
      <p role="status" className="text-muted-foreground mt-2 text-sm">
        {message}
      </p>
      {debt > 0 ? (
        <p className="mt-2 text-sm">
          {debt} previously used, refunded credits will be settled by your next
          top-up.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/pricing">
            {access?.lifetime ? "Top up AI credits" : "View plans and credits"}
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Refresh payment status
        </Button>
      </div>
    </section>
  );
}
