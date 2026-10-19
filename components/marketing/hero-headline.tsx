import type { CSSProperties } from "react";

const LINE_1 = ["Make", "your", "screenshot"];
const LINE_2 = ["the", "main", "character."];

function Word({
  index,
  children,
  className = "",
}: {
  index: number;
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`hero-word ${className}`}
      style={{ "--i": index } as CSSProperties}
    >
      {children}
    </span>
  );
}

/**
 * Hero headline: words rise in one after another, then a light sweep passes
 * over the second line. Screen readers get the plain sentence; the animated
 * copy is aria-hidden. All motion is off under prefers-reduced-motion.
 */
export function HeroHeadline() {
  return (
    <h1 className="relative mx-auto max-w-4xl text-[2.75rem] leading-[1.02] font-bold tracking-[-0.045em] text-balance sm:text-7xl">
      <span className="sr-only">Make your screenshot the main character.</span>
      <span aria-hidden className="block">
        {LINE_1.map((word, index) => (
          <span key={word}>
            <Word index={index}>{word}</Word>
            {index < LINE_1.length - 1 ? " " : null}
          </span>
        ))}
      </span>
      <span aria-hidden className="relative block">
        {LINE_2.map((word, index) => (
          <span key={word}>
            <Word index={LINE_1.length + index} className="text-muted-solid">
              {word}
            </Word>
            {index < LINE_2.length - 1 ? " " : null}
          </span>
        ))}
        {/* Same text laid over the line; only the moving highlight shows. */}
        <span className="hero-shine pointer-events-none absolute inset-0">
          {LINE_2.join(" ")}
        </span>
      </span>
    </h1>
  );
}
