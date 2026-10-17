import { create } from "zustand";
import {
  DEFAULT_ANNOTATION_STYLE,
  type AnnotationStyle,
  type AnnotationToolId,
} from "@/lib/editor/annotation-tools";
import type { CropAspectId } from "@/lib/editor/crop";
import {
  DEFAULT_REDACT_STYLE,
  type RedactStyle,
} from "@/lib/editor/redact-tools";
import type { RedactMode } from "@/lib/scene";

export type PendingImage = {
  element: HTMLImageElement;
  url: string;
  name: string;
  blob: Blob;
};

export type UiStore = {
  selectedLayerId: string | null;
  selectLayer: (id: string | null) => void;
  annotationTool: AnnotationToolId | null;
  setAnnotationTool: (tool: AnnotationToolId | null) => void;
  annotationStyle: AnnotationStyle;
  setAnnotationStyle: (patch: Partial<AnnotationStyle>) => void;
  redactTool: RedactMode | null;
  setRedactTool: (mode: RedactMode | null) => void;
  redactStyle: RedactStyle;
  setRedactStyle: (patch: Partial<RedactStyle>) => void;
  cropTool: boolean;
  setCropTool: (active: boolean) => void;
  cropAspect: CropAspectId;
  setCropAspect: (id: CropAspectId) => void;
  pendingImage: PendingImage | null;
  setPendingImage: (image: PendingImage) => void;
  resolvePendingImage: () => void;
  cancelPendingImage: () => void;
};

/**
 * Ephemeral editor UI state. Deliberately outside zundo/history and drafts —
 * selection and active tools must not undo with the scene (ARCH §4.4).
 */
export const useUiStore = create<UiStore>()((set, get) => ({
  selectedLayerId: null,
  selectLayer: (id) => set({ selectedLayerId: id }),
  annotationTool: null,
  setAnnotationTool: (tool) =>
    set({
      annotationTool: tool,
      redactTool: tool ? null : get().redactTool,
      cropTool: tool ? false : get().cropTool,
      selectedLayerId: tool ? null : get().selectedLayerId,
    }),
  annotationStyle: { ...DEFAULT_ANNOTATION_STYLE },
  setAnnotationStyle: (patch) =>
    set((state) => ({
      annotationStyle: { ...state.annotationStyle, ...patch },
    })),
  redactTool: null,
  setRedactTool: (mode) =>
    set({
      redactTool: mode,
      annotationTool: mode ? null : get().annotationTool,
      cropTool: mode ? false : get().cropTool,
      selectedLayerId: mode ? null : get().selectedLayerId,
      redactStyle: mode ? { ...get().redactStyle, mode } : get().redactStyle,
    }),
  redactStyle: { ...DEFAULT_REDACT_STYLE },
  setRedactStyle: (patch) =>
    set((state) => ({ redactStyle: { ...state.redactStyle, ...patch } })),
  cropTool: false,
  setCropTool: (active) =>
    set({
      cropTool: active,
      annotationTool: active ? null : get().annotationTool,
      redactTool: active ? null : get().redactTool,
      selectedLayerId: active ? null : get().selectedLayerId,
    }),
  cropAspect: "free",
  setCropAspect: (id) => set({ cropAspect: id }),
  pendingImage: null,
  setPendingImage: (image) =>
    set((state) => {
      if (state.pendingImage && state.pendingImage.url !== image.url) {
        URL.revokeObjectURL(state.pendingImage.url);
      }
      return { pendingImage: image };
    }),
  resolvePendingImage: () => set({ pendingImage: null }),
  cancelPendingImage: () =>
    set((state) => {
      if (state.pendingImage) URL.revokeObjectURL(state.pendingImage.url);
      return { pendingImage: null };
    }),
}));
