"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { EditorCanvas } from "@/components/editor/canvas";
import { ReplaceImageDialog } from "@/components/editor/replace-image-dialog";
import { V2AiDrawer } from "@/components/editor-v2/v2-ai-drawer";
import { V2Inspector } from "@/components/editor-v2/v2-inspector";
import { V2ToolRail } from "@/components/editor-v2/v2-tool-rail";
import { V2TopBar } from "@/components/editor-v2/v2-top-bar";
import { V2_TOOL_LABELS, type V2ToolId } from "@/components/editor-v2/tools";
import { fetchCredits } from "@/lib/api/credits";
import { capturePostImageForAi } from "@/lib/editor/ai-image";
import { computeExportSize } from "@/lib/renderer";
import { croppedImageSize } from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";
import { useCreditsStore } from "@/lib/store/credits-store";
import { useEditorShortcuts } from "@/lib/store/use-editor-shortcuts";
import { useLocalDraft } from "@/lib/store/use-local-draft";
import { useBrandKitLoader } from "@/lib/brand/use-brand-kit";

export default function EditorV2Page() {
  useEditorShortcuts();
  const draft = useLocalDraft();
  useBrandKitLoader();
  const [activeTool, setActiveTool] = useState<V2ToolId | null>("image");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiPreviewBusy, setAiPreviewBusy] = useState(false);
  const scene = useEditorStore((state) => state.scene);
  const imageElement = useEditorStore((state) => state.imageElement);
  const captureId = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const hadV2 = root.classList.contains("v2-studio");
    root.classList.add("dark", "v2-studio");
    return () => {
      if (!hadDark) root.classList.remove("dark");
      if (!hadV2) root.classList.remove("v2-studio");
    };
  }, []);

  const capturePreview = useCallback(async (): Promise<string | null> => {
    const id = ++captureId.current;
    const { scene, imageElement } = useEditorStore.getState();
    if (!scene.image || !imageElement) {
      setAiPreview(null);
      setAiPreviewBusy(false);
      return null;
    }
    setAiPreviewBusy(true);
    try {
      const liveCanvas = useUiStore.getState().cropTool
        ? null
        : document.querySelector<HTMLCanvasElement>(
            "canvas[data-editor-preview]",
          );
      const dataUrl = await capturePostImageForAi(
        scene,
        imageElement,
        1024,
        liveCanvas,
      );
      if (id === captureId.current) setAiPreview(dataUrl);
      return dataUrl;
    } catch {
      if (id === captureId.current) setAiPreview(null);
      return null;
    } finally {
      if (id === captureId.current) setAiPreviewBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!aiOpen) return;
    const timer = setTimeout(() => {
      void capturePreview();
    }, 600);
    return () => {
      clearTimeout(timer);
      captureId.current += 1;
    };
  }, [aiOpen, scene, imageElement, capturePreview]);

  async function refreshCredits() {
    const info = await fetchCredits();
    if (info) {
      useCreditsStore.getState().setCredits(info.credits, info.resetAt);
    }
  }

  function toggleAi() {
    if (aiOpen) {
      setAiOpen(false);
      return;
    }
    setAiOpen(true);
    void refreshCredits();
  }

  function clearModes() {
    const ui = useUiStore.getState();
    ui.setAnnotationTool(null);
    ui.setRedactTool(null);
    ui.setCropTool(false);
  }

  function selectTool(tool: V2ToolId) {
    const next = activeTool === tool ? null : tool;
    setActiveTool(next);
    if (next === null) {
      clearModes();
      return;
    }
    const ui = useUiStore.getState();
    if (next !== "annotate") ui.setAnnotationTool(null);
    if (next !== "redact") ui.setRedactTool(null);
    if (next !== "crop") ui.setCropTool(false);
  }

  function closeInspector() {
    setActiveTool(null);
    clearModes();
  }

  if (!draft.ready) {
    return (
      <main
        className="v2-studio dark bg-background text-muted-foreground flex min-h-dvh items-center justify-center gap-2 text-sm"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Restoring your last draft…
      </main>
    );
  }

  const output = computeExportSize(
    scene,
    1,
    croppedImageSize(
      scene,
      scene.image
        ? { width: scene.image.width, height: scene.image.height }
        : null,
    ),
  );

  return (
    <div className="v2-studio dark bg-background text-foreground flex h-dvh flex-col overflow-hidden">
      <V2TopBar
        aiOpen={aiOpen}
        onToggleAi={toggleAi}
        draftReady={draft.ready}
        draftError={draft.error}
      />
      <ReplaceImageDialog />

      {draft.error ? (
        <p
          role="alert"
          className="text-destructive bg-background border-b px-4 py-2 text-sm"
        >
          {draft.error}
        </p>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <V2ToolRail
          activeTool={activeTool}
          aiOpen={aiOpen}
          onSelect={selectTool}
          onToggleAi={toggleAi}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="font-medium">Canvas</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground truncate">
                {scene.image ? "Editing" : "New composition"}
              </span>
              {activeTool ? (
                <span className="border-border bg-card text-muted-foreground hidden rounded-full border px-2 py-0.5 text-[10px] sm:inline-flex">
                  {V2_TOOL_LABELS[activeTool]}
                </span>
              ) : null}
            </div>
            <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-[11px]">
              <span>
                {scene.image
                  ? `${output.width} × ${output.height}`
                  : "No screenshot"}
              </span>
              <span className="bg-border h-3 w-px" aria-hidden />
              <span>
                {scene.layers.length} layer
                {scene.layers.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <div className="v2-canvas-stage border-border/80 h-full overflow-hidden rounded-2xl border p-3 sm:p-5">
              <EditorCanvas />
            </div>
          </div>

          <footer className="text-muted-foreground flex h-10 shrink-0 items-center justify-between gap-3 border-t px-4 text-[11px]">
            <span className="truncate">
              Drag image to reposition · Ctrl/⌘ Z undo · Esc cancels tools
            </span>
            <span className="hidden shrink-0 items-center gap-2 sm:flex">
              <span
                className="size-1.5 rounded-full bg-emerald-400"
                aria-hidden
              />
              Local draft
            </span>
          </footer>
        </main>

        {activeTool ? (
          <V2Inspector tool={activeTool} onClose={closeInspector} />
        ) : null}

        <V2AiDrawer
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          previewImage={scene.image && imageElement ? aiPreview : null}
          previewBusy={aiPreviewBusy}
          onCapturePreview={capturePreview}
        />
      </div>
    </div>
  );
}
