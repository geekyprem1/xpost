import type { CSSProperties } from "react";

const CELL = 52; // Must match the tile size in .tile-grid (globals.css).

/**
 * Deterministic pseudo-random tile picks, so server and client render the
 * same markup. Biased toward the top rows, where the grid is most visible.
 */
const TWINKLES = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 64 }, () => ({
    col: Math.floor(next() * 40),
    row: Math.floor(next() ** 1.4 * 22),
    delay: Math.round(next() * 60) / 10,
    duration: 3 + Math.round(next() * 30) / 10,
  }));
})();

/** Tile-grid backdrop with drifting color light and tiles that softly blink. */
export function AnimatedTiles() {
  return (
    <div
      aria-hidden
      className="tile-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1400px] overflow-hidden"
    >
      <span className="tile-glow tile-glow-a" />
      <span className="tile-glow tile-glow-b" />
      <span className="tile-glow tile-glow-c" />
      {TWINKLES.map((tile, index) => (
        <span
          key={index}
          className="tile-twinkle"
          style={
            {
              left: tile.col * CELL,
              top: tile.row * CELL,
              width: CELL,
              height: CELL,
              // Negative delay: tiles are mid-cycle on load, so motion shows at once.
              animationDelay: `-${tile.delay}s`,
              animationDuration: `${tile.duration}s`,
            } as CSSProperties
          }
        />
      ))}
      {/* Calm spot behind the headline and subtext so the copy stays legible. */}
      <span className="tile-spotlight" />
    </div>
  );
}
