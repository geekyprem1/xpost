"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorCanvas } from "@/components/editor/canvas";
import { RightPanel } from "@/components/editor/right-panel";
import { Toolbar, type PanelId } from "@/components/editor/toolbar";
import { TopBar } from "@/components/editor/top-bar";
import { capturePostImageForAi } from "@/lib/editor/ai-image";
import { fetchCredits } from "@/lib/api/credits";
import { useEditorStore } from "@/lib/store";
import { useCreditsStore } from "@/lib/store/credits-store";
import { useEditorShortcuts } from "@/lib/store/use-editor-shortcuts";
import { Aperture, ArrowUpRight } from "lucide-react";

export default function EditorPage() {
  useEditorShortcuts();
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiPreviewBusy, setAiPreviewBusy] = useState(false);

  const scene = useEditorStore((state) => state.scene);
  const imageElement = useEditorStore((state) => state.imageElement);
  const captureId = useRef(0);

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
      const dataUrl = await capturePostImageForAi(
        scene,
        imageElement,
        1024,
        document.querySelector<HTMLCanvasElement>(
          "canvas[data-editor-preview]",
        ),
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

  return (
    <div
      className={`editor-shell flex h-dvh flex-col overflow-hidden ${scene.image ? "" : "editor-empty"}`}
    >
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <main className="editor-workspace relative flex min-h-0 min-w-0 flex-1 flex-col px-3 pt-3 sm:px-6 sm:pt-5">
          <h1 className="sr-only">Shotlark editor</h1>
          <div className="workspace-heading">
            <div>
              <Aperture size={16} aria-hidden />
              <span>Canvas</span>
              <span className="workspace-status">
                {scene.image ? "Editing" : "New composition"}
              </span>
            </div>
            <button type="button" onClick={toggleAi} aria-expanded={aiOpen}>
              AI Post Studio <ArrowUpRight size={14} aria-hidden />
            </button>
          </div>
          <div className="canvas-stage min-h-0 w-full flex-1">
            <EditorCanvas />
          </div>
          <div className="workspace-dock flex w-full shrink-0 justify-center">
            <Toolbar
              openPanel={openPanel}
              onOpenPanel={setOpenPanel}
              aiOpen={aiOpen}
              onToggleAi={toggleAi}
            />
          </div>
          <div className="workspace-footer">
            <span>SHOTLARK STUDIO</span>
            <span>
              {scene.image
                ? "Drag your image to reposition"
                : "Your next great post starts here"}
            </span>
            <span>Made to stand out</span>
          </div>
        </main>
        <RightPanel
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
