"use client";

import {
  Bot,
  Crop,
  Frame,
  ImagePlus,
  LayoutGrid,
  ListOrdered,
  Move,
  Paintbrush,
  Palette,
  PenLine,
  ShieldOff,
  Sun,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { V2_TOOL_GROUPS, V2_TOOL_LABELS, type V2ToolId } from "./tools";

const ICONS: Record<V2ToolId, LucideIcon> = {
  image: ImagePlus,
  text: Type,
  annotate: PenLine,
  redact: ShieldOff,
  crop: Crop,
  layers: ListOrdered,
  background: Palette,
  frame: Frame,
  style: Paintbrush,
  layout: LayoutGrid,
  position: Move,
  sunlight: Sun,
  auto: WandSparkles,
};

function RailButton({
  id,
  active,
  onClick,
}: {
  id: V2ToolId;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = ICONS[id];
  const label = V2_TOOL_LABELS[id];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none ${
        active
          ? "bg-primary/10 text-primary ring-primary/25 ring-1"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="size-[18px]" aria-hidden />
      <span className="leading-none">{label}</span>
    </button>
  );
}

export function V2ToolRail({
  activeTool,
  aiOpen,
  onSelect,
  onToggleAi,
}: {
  activeTool: V2ToolId | null;
  aiOpen: boolean;
  onSelect: (tool: V2ToolId) => void;
  onToggleAi: () => void;
}) {
  return (
    <nav
      aria-label="Editor tools"
      className="bg-card/40 flex w-[76px] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r px-2 py-3"
    >
      {V2_TOOL_GROUPS.map((group, index) => (
        <div key={group.label} className="w-full">
          {index > 0 ? (
            <div className="bg-border/70 my-2 h-px w-full" aria-hidden />
          ) : null}
          <p className="text-muted-foreground mb-1 text-center text-[9px] font-semibold tracking-[0.16em] uppercase">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.tools.map((tool) => (
              <RailButton
                key={tool}
                id={tool}
                active={activeTool === tool}
                onClick={() => onSelect(tool)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="mt-auto w-full pt-3">
        <div className="bg-border/70 mb-2 h-px w-full" aria-hidden />
        <button
          type="button"
          aria-label="AI Post Studio"
          aria-pressed={aiOpen}
          title="AI Post Studio"
          onClick={onToggleAi}
          className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none ${
            aiOpen
              ? "bg-primary/10 text-primary ring-primary/25 ring-1"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <Bot className="size-[18px]" aria-hidden />
          <span className="leading-none">AI</span>
        </button>
      </div>
    </nav>
  );
}
