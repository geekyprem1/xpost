"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Aperture, ArrowUpRight, FolderOpen } from "lucide-react";
import { EditorCanvas } from "@/components/editor/canvas";
import { ProjectConflictDialog } from "@/components/editor/project-conflict-dialog";
import { ReplaceImageDialog } from "@/components/editor/replace-image-dialog";
import { RightPanel } from "@/components/editor/right-panel";
import { Toolbar, type PanelId } from "@/components/editor/toolbar";
import { TopBar } from "@/components/editor/top-bar";
import { Button } from "@/components/ui/button";
import { capturePostImageForAi } from "@/lib/editor/ai-image";
import { fetchCredits } from "@/lib/api/credits";
import { useBrandKitLoader } from "@/lib/brand/use-brand-kit";
import { useEditorHandoff } from "@/lib/editor/use-editor-handoff";
import { useProjectSessionStore } from "@/lib/projects/project-store";
import {
  useProjectPromotion,
  useProjectSession,
} from "@/lib/projects/use-project-session";
import { useEditorStore, useUiStore } from "@/lib/store";
import { useCreditsStore } from "@/lib/store/credits-store";
import { useEditorShortcuts } from "@/lib/store/use-editor-shortcuts";
import { useLocalDraft } from "@/lib/store/use-local-draft";

/**
 * Classic editor shell. `projectId === null` → /editor (local draft, first
 * screenshot creates a cloud project); otherwise /editor/[projectId].
 */
export function EditorWorkspace({ projectId }: { projectId: string | null }) {
  useEditorShortcuts();
  const isDraft = projectId === null;
  const draft = useLocalDraft(isDraft);
  useProjectPromotion(isDraft && draft.ready, draft.discard);
  const project = useProjectSession(projectId);
  useEditorHandoff(isDraft && draft.ready);
  useBrandKitLoader();
  const ready = isDraft ? draft.ready : project.ready;
  const sessionMessage = useProjectSessionStore((state) => state.message);

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

  if (!isDraft && project.notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Project not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          It may have been deleted, or it belongs to another account.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">
              <FolderOpen aria-hidden />
              Your projects
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/editor">New project</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main
        className="text-muted-foreground flex min-h-dvh items-center justify-center text-sm"
        role="status"
      >
        {isDraft ? "Restoring your last draft..." : "Opening your project..."}
        <ProjectConflictDialog />
      </main>
    );
  }

  if (!isDraft && project.error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">
          This project could not be opened
        </h1>
        <p role="alert" className="text-muted-foreground max-w-sm text-sm">
          {project.error}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={project.retryOpen}>
            Try again
          </Button>
          <Button asChild size="sm">
            <Link href="/projects">Your projects</Link>
          </Button>
        </div>
      </main>
    );
  }

  const banner = draft.error ?? sessionMessage;

  return (
    <div
      className={`editor-shell flex h-dvh flex-col overflow-hidden ${scene.image ? "" : "editor-empty"}`}
    >
      <TopBar />
      <ReplaceImageDialog />
      <ProjectConflictDialog />
      {banner ? (
        <p
          role="alert"
          className="bg-background text-destructive border-b px-4 py-2 text-sm"
        >
          {banner}
        </p>
      ) : null}
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
