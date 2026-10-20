"use client";

import {
  Bot,
  Crop,
  Frame,
  ImagePlus,
  Layers,
  LayoutGrid,
  ListOrdered,
  Move,
  Palette,
  PenLine,
  ShieldOff,
  Stamp,
  Sun,
  Trash2,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { ScreenCapture } from "@/components/editor/screen-capture";
import { AnnotatePanel } from "@/components/editor/panels/annotate-panel";
import { AutoPanel } from "@/components/editor/panels/auto-panel";
import { BackgroundPanel } from "@/components/editor/panels/background-panel";
import { BrandPanel } from "@/components/editor/panels/brand-panel";
import { CropPanel } from "@/components/editor/panels/crop-panel";
import { FramePanel } from "@/components/editor/panels/frame-panel";
import { LayoutPanel } from "@/components/editor/panels/layout-panel";
import { LayersPanel } from "@/components/editor/panels/layers-panel";
import { PositionPanel } from "@/components/editor/panels/position-panel";
import { RedactPanel } from "@/components/editor/panels/redact-panel";
import { StylePanel } from "@/components/editor/panels/style-panel";
import { SunlightPanel } from "@/components/editor/panels/sunlight-panel";
import { TextPanel } from "@/components/editor/panels/text-panel";
import { Button } from "@/components/ui/button";
import { useImageActions } from "@/lib/image/use-image-actions";
import { useEditorStore } from "@/lib/store";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export type PanelId =
  | "text"
  | "annotate"
  | "redact"
  | "crop"
  | "background"
  | "frame"
  | "style"
  | "layers"
  | "position"
  | "layout"
  | "sunlight"
  | "auto"
  | "brand";

const PANEL_TOOLS: { id: PanelId; label: string; icon: LucideIcon }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "annotate", label: "Annotate", icon: PenLine },
  { id: "redact", label: "Redact", icon: ShieldOff },
  { id: "crop", label: "Crop", icon: Crop },
  { id: "background", label: "Background", icon: Palette },
  { id: "frame", label: "Frame", icon: Frame },
  { id: "style", label: "Style", icon: Layers },
  { id: "layers", label: "Layers", icon: ListOrdered },
  { id: "position", label: "Position", icon: Move },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "sunlight", label: "Sunlight", icon: Sun },
  { id: "auto", label: "Auto", icon: WandSparkles },
  { id: "brand", label: "Brand", icon: Stamp },
];

export function Toolbar({
  openPanel,
  onOpenPanel,
  aiOpen,
  onToggleAi,
}: {
  openPanel: PanelId | null;
  onOpenPanel: (panel: PanelId | null) => void;
  aiOpen: boolean;
  onToggleAi: () => void;
}) {
  const hasImage = useEditorStore((state) => state.scene.image !== null);
  const { openPicker, removeImage } = useImageActions();

  return (
    <div
      role="toolbar"
      aria-label="Editor tools"
      aria-orientation="horizontal"
      className={`editor-toolbar bg-background/95 flex max-w-full items-center gap-0.5 rounded-2xl border p-2 shadow-xl backdrop-blur-xl ${hasImage ? "" : "empty-toolbar"}`}
    >
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={hasImage ? "Replace image" : "Add image"}
        title={hasImage ? "Replace image" : "Add image"}
        onClick={openPicker}
      >
        <ImagePlus aria-hidden />
        <span className="tool-label">{hasImage ? "Replace" : "Add image"}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={!hasImage}
        className={!hasImage ? "hidden" : undefined}
        aria-label="Remove image"
        title="Remove image"
        onClick={removeImage}
      >
        <Trash2 aria-hidden />
        <span className="tool-label">Remove</span>
      </Button>
      <div
        role="separator"
        aria-orientation="vertical"
        className="bg-border mx-1 h-6 w-px self-center"
      />
      <ScreenCapture />
      {PANEL_TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Popover
            key={tool.id}
            open={openPanel === tool.id}
            onOpenChange={(open) => onOpenPanel(open ? tool.id : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                title={tool.label}
                aria-label={tool.label}
                aria-expanded={openPanel === tool.id}
              >
                <Icon aria-hidden />
                <span className="tool-label">{tool.label}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              aria-label={tool.label}
              className={
                tool.id === "text" ||
                tool.id === "annotate" ||
                tool.id === "redact" ||
                tool.id === "crop" ||
                tool.id === "background" ||
                tool.id === "position" ||
                tool.id === "layout" ||
                tool.id === "style" ||
                tool.id === "layers" ||
                tool.id === "sunlight" ||
                tool.id === "frame" ||
                tool.id === "brand"
                  ? "max-h-[65dvh] w-88 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-4"
                  : undefined
              }
            >
              {tool.id === "text" ? (
                <TextPanel />
              ) : tool.id === "annotate" ? (
                <AnnotatePanel />
              ) : tool.id === "redact" ? (
                <RedactPanel />
              ) : tool.id === "crop" ? (
                <CropPanel onClose={() => onOpenPanel(null)} />
              ) : tool.id === "background" ? (
                <BackgroundPanel />
              ) : tool.id === "frame" ? (
                <FramePanel />
              ) : tool.id === "position" ? (
                <PositionPanel />
              ) : tool.id === "layout" ? (
                <LayoutPanel />
              ) : tool.id === "style" ? (
                <StylePanel />
              ) : tool.id === "layers" ? (
                <LayersPanel />
              ) : tool.id === "sunlight" ? (
                <SunlightPanel />
              ) : tool.id === "auto" ? (
                <AutoPanel />
              ) : tool.id === "brand" ? (
                <BrandPanel />
              ) : (
                <>
                  <PopoverTitle>{tool.label}</PopoverTitle>
                  <PopoverDescription>
                    {tool.label} settings are coming soon.
                  </PopoverDescription>
                </>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
      <div
        role="separator"
        aria-orientation="vertical"
        className="bg-border mx-1 h-6 w-px self-center"
      />
      <Button
        variant={aiOpen ? "secondary" : "ghost"}
        size="icon"
        type="button"
        title="AI Post Studio"
        aria-label="AI Post Generator"
        aria-pressed={aiOpen}
        onClick={onToggleAi}
      >
        <Bot aria-hidden />
        <span className="tool-label">
          {hasImage ? "AI Post" : "AI Post Generator"}
        </span>
      </Button>
    </div>
  );
}
