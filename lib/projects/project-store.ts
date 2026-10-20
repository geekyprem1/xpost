import { create } from "zustand";

/**
 * UI-facing state of the open project (top bar title / save status,
 * conflict dialog). Persistence logic lives in use-project-session.ts.
 */
export type ProjectSaveStatus =
  | "local" // /editor: local draft, no cloud project yet
  | "creating"
  | "loading"
  | "saved"
  | "dirty"
  | "saving"
  | "offline"
  | "error"
  | "conflict";

export type ConflictChoice = "local" | "cloud";

type ProjectSessionState = {
  projectId: string | null;
  title: string | null;
  status: ProjectSaveStatus;
  message: string | null;
  /** "open" = cache vs cloud at load; "save" = cloud changed while editing. */
  conflict: "open" | "save" | null;
  resolveConflict: ((choice: ConflictChoice) => void) | null;
  retry: (() => void) | null;
  set: (patch: Partial<Omit<ProjectSessionState, "set" | "reset">>) => void;
  reset: () => void;
};

const INITIAL = {
  projectId: null,
  title: null,
  status: "local" as ProjectSaveStatus,
  message: null,
  conflict: null,
  resolveConflict: null,
  retry: null,
};

export const useProjectSessionStore = create<ProjectSessionState>()((set) => ({
  ...INITIAL,
  set: (patch) => set(patch),
  reset: () => set(INITIAL),
}));

export function projectStatusLabel(status: ProjectSaveStatus): string {
  switch (status) {
    case "local":
      return "Local draft";
    case "creating":
      return "Creating project…";
    case "loading":
      return "Opening…";
    case "saved":
      return "Saved";
    case "dirty":
      return "Unsaved changes";
    case "saving":
      return "Saving…";
    case "offline":
      return "Saved in this browser";
    case "error":
      return "Not saved";
    case "conflict":
      return "Needs your choice";
  }
}

export function projectHref(projectId: string): string {
  return `/editor/${projectId}`;
}
