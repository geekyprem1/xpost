"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  LOOK_CATEGORIES,
  looksIn,
  type Look,
  type LookCategory,
} from "@/lib/looks/looks";
import { LookPreview } from "./look-preview";
import { useOpenInEditor } from "./open-in-editor";

/** "Pick a look" rows. Picking a card opens the editor with that look. */
export function LookGallery() {
  return (
    <div className="space-y-14">
      {LOOK_CATEGORIES.map((category) => (
        <LookRow key={category.id} id={category.id} name={category.name} />
      ))}
    </div>
  );
}

function LookRow({ id, name }: { id: LookCategory; name: string }) {
  const rowRef = useRef<HTMLUListElement>(null);
  const looks = looksIn(id);
  const headingId = `looks-${id}`;

  function scroll(direction: 1 | -1) {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * row.clientWidth * 0.8,
      behavior: "smooth",
    });
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-4">
        <h3 id={headingId} className="text-lg font-semibold tracking-tight">
          {name}
          {id === "motion" ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              Plays on hover
            </span>
          ) : null}
        </h3>
        <div className="flex gap-1">
          <ScrollButton
            label={`Scroll ${name} looks left`}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </ScrollButton>
          <ScrollButton
            label={`Scroll ${name} looks right`}
            onClick={() => scroll(1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </ScrollButton>
        </div>
      </div>
      <ul
        ref={rowRef}
        className="no-scrollbar -mx-6 mt-4 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 sm:-mx-0 sm:scroll-px-0 sm:px-0"
      >
        {looks.map((look) => (
          <li
            key={look.id}
            className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)]"
          >
            <LookCard look={look} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LookCard({ look }: { look: Look }) {
  const { openWithLook } = useOpenInEditor();
  const [active, setActive] = useState(false);
  const wide = look.aspect === "16:10" || look.aspect === "16:9";

  return (
    <button
      type="button"
      onClick={() => openWithLook(look.id)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="group focus-visible:outline-primary w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4"
      aria-label={`Use the ${look.name} look (${look.caption})`}
    >
      <span className="bg-muted/70 border-foreground/5 relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border">
        <LookPreview
          look={look}
          playing={active && look.background.kind === "video"}
          className={`transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none ${wide ? "size-full" : "h-[86%] rounded-xl shadow-[0_18px_40px_-18px_rgba(10,6,30,0.5)]"}`}
        />
        <span className="bg-foreground text-background pointer-events-none absolute right-3 bottom-3 translate-y-1 rounded-full px-3 py-1.5 text-xs font-medium opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
          Use this look
        </span>
      </span>
      <span className="mt-3 flex items-baseline justify-between gap-3 px-1 text-sm">
        <span className="truncate font-medium">{look.name}</span>
        <span className="text-muted-foreground shrink-0">{look.caption}</span>
      </span>
    </button>
  );
}

function ScrollButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border-foreground/10 hover:bg-foreground/5 inline-flex size-11 items-center justify-center rounded-full border transition-colors"
    >
      {children}
    </button>
  );
}
