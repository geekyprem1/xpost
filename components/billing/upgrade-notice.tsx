import Link from "next/link";
export function UpgradeNotice({ feature }: { feature: string }) {
  return (
    <div className="bg-muted/40 rounded-xl border p-4 text-sm">
      <p className="font-medium">{feature} is included in Lifetime Editor.</p>
      <p className="text-muted-foreground mt-1">One payment. Yours forever.</p>
      <Link
        href="/pricing"
        className="text-primary mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
      >
        Unlock for $9.99
      </Link>
    </div>
  );
}
