"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductKey } from "@/lib/billing/catalog";

export function CheckoutButton({
  product,
  children,
  featured = false,
}: {
  product: ProductKey;
  children: React.ReactNode;
  featured?: boolean;
}) {
  const router = useRouter();
  const attempt = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError(null);
    attempt.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, attempt: attempt.current }),
      });
      if (response.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409) attempt.current = null;
        throw new Error(payload.error ?? "Unable to open checkout.");
      }
      const url = new URL(payload.url);
      if (url.protocol !== "https:") throw new Error("Invalid checkout link.");
      window.location.assign(url.toString());
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to open checkout.",
      );
      setBusy(false);
    }
  }
  return (
    <div>
      <Button
        onClick={() => void checkout()}
        disabled={busy}
        className={`min-h-11 w-full rounded-xl ${featured ? "shadow-lg" : ""}`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {busy ? "Opening checkout…" : children}
      </Button>
      {error ? (
        <p
          role="alert"
          className={`mt-2 text-xs ${featured ? "text-red-200" : "text-destructive"}`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
