"use client";

import { X } from "lucide-react";
import { AnnotatePanel } from "@/components/editor/panels/annotate-panel";
import { AutoPanel } from "@/components/editor/panels/auto-panel";
import { BackgroundPanel } from "@/components/editor/panels/background-panel";
import { CropPanel } from "@/components/editor/panels/crop-panel";
import { FramePanel } from "@/components/editor/panels/frame-panel";
import { LayersPanel } from "@/components/editor/panels/layers-panel";
import { LayoutPanel } from "@/components/editor/panels/layout-panel";
import { PositionPanel } from "@/components/editor/panels/position-panel";
import { RedactPanel } from "@/components/editor/panels/redact-panel";
import { StylePanel } from "@/components/editor/panels/style-panel";
import { SunlightPanel } from "@/components/editor/panels/sunlight-panel";
import { TextPanel } from "@/components/editor/panels/text-panel";
import { Button } from "@/components/ui/button";
import { V2ImagePanel } from "./v2-image-panel";
import { V2_TOOL_LABELS, type V2ToolId } from "./tools";

function Panel({ tool }: { tool: V2ToolId }) {
  switch (tool) {
    case "image":
      return <V2ImagePanel />;
    case "text":
      return <TextPanel />;
    case "annotate":
      return <AnnotatePanel />;
    case "redact":
      return <RedactPanel />;
    case "crop":
      return <CropPanel />;
    case "layers":
      return <LayersPanel />;
    case "background":
      return <BackgroundPanel />;
    case "frame":
      return <FramePanel />;
    case "style":
      return <StylePanel />;
    case "layout":
      return <LayoutPanel />;
    case "position":
      return <PositionPanel />;
    case "sunlight":
      return <SunlightPanel />;
    case "auto":
      return <AutoPanel />;
  }
}

export function V2Inspector({
  tool,
  onClose,
}: {
  tool: V2ToolId;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label={`${V2_TOOL_LABELS[tool]} settings`}
      className="bg-card/95 absolute inset-y-0 right-0 z-20 flex w-[min(22rem,92vw)] flex-col border-l shadow-2xl backdrop-blur-xl lg:static lg:z-auto lg:w-[320px] lg:shadow-none"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          {V2_TOOL_LABELS[tool]}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label="Close inspector"
          title="Close inspector"
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Panel tool={tool} />
      </div>
    </aside>
  );
}
