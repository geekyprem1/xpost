"use client";

import { useBrandStore } from "@/lib/brand/brand-store";

/**
 * Brand colors row (BK-3) — background, text aur annotation pickers mein
 * sabse upar. Koi brand color na ho to kuch render nahi hota.
 */
export function BrandSwatches({
  value,
  onPick,
  label = "Brand colors",
  size = "md",
}: {
  value?: string;
  onPick: (color: string) => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const colors = useBrandStore((state) => state.kit.colors);
  if (colors.length === 0) return null;
  const current = value?.toLowerCase();
  const dimension = size === "sm" ? "size-5" : "size-6";
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1.5"
    >
      {colors.map((color) => {
        const active = current === color;
        return (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={`${label}: ${color}`}
            aria-pressed={active}
            className={`${dimension} focus-visible:ring-ring rounded-md border-2 outline-none focus-visible:ring-2 ${
              active ? "border-ring" : "border-border/60"
            }`}
            style={{ background: color }}
            onClick={() => onPick(color)}
          />
        );
      })}
    </div>
  );
}
