import { create } from "zustand";
import { temporal } from "zundo";
import {
  createDefaultScene,
  MAX_LAYERS,
  type Layer,
  type Scene,
} from "@/lib/scene";
import { useUiStore } from "./ui-store";

export const HISTORY_LIMIT = 50;

export type SetSceneOptions = {
  transient?: boolean;
};

type Gesture = {
  baselineScene: Scene;
  pastStatesBefore: Partial<EditorStore>[];
};

export type EditorStore = {
  scene: Scene;
  imageUrl: string | null;
  imageElement: HTMLImageElement | null;
  imageBlob: Blob | null;
  postText: string;
  setPostText: (value: string | ((text: string) => string)) => void;
  imageError: string | null;
  setScene: (
    updater: (scene: Scene) => Scene,
    options?: SetSceneOptions,
  ) => void;
  addLayer: (layer: Layer, index?: number) => void;
  updateLayer: (
    id: string,
    updater: (layer: Layer) => Layer,
    options?: SetSceneOptions,
  ) => void;
  removeLayer: (id: string) => void;
  reorderLayer: (id: string, toIndex: number) => void;
  commitScene: () => void;
  replaceScene: (scene: Scene) => void;
  setImage: (
    element: HTMLImageElement,
    url: string,
    name: string,
    blob?: Blob,
    options?: {
      clearLayers?: boolean;
      /** Restore (draft / project load): saved image meta incl. crop rakho. */
      restore?: NonNullable<Scene["image"]>;
    },
  ) => void;
  clearImage: () => void;
  setImageError: (message: string | null) => void;
};

let activeGesture: Gesture | null = null;

function scenesEqual(a: Scene, b: Scene): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Ends an open transient gesture (slider drag, canvas drag). Pins exactly one
 * history entry (the pre-gesture scene) if the scene actually changed, and
 * always resumes history tracking so it can never stay paused.
 */
function finalizeGesture(currentScene: Scene) {
  if (!activeGesture) return;
  const gesture = activeGesture;
  activeGesture = null;
  const temporalStore = useEditorStore.temporal;
  if (!scenesEqual(gesture.baselineScene, currentScene)) {
    const pinned = [
      ...gesture.pastStatesBefore,
      { scene: gesture.baselineScene },
    ].slice(-HISTORY_LIMIT);
    temporalStore.setState({ pastStates: pinned, futureStates: [] });
  }
  temporalStore.getState().resume();
}

/**
 * The loaded screenshot (element + object URL) is not part of history, so
 * `scene.image` must not be either — otherwise undo restores image metadata
 * whose element/URL no longer exists. Rewrites every history snapshot (and an
 * open gesture's baseline) to carry the current image.
 */
function syncImageAcrossHistory(image: Scene["image"]) {
  const withImage = (state: Partial<EditorStore>): Partial<EditorStore> =>
    state.scene ? { ...state, scene: { ...state.scene, image } } : state;
  const temporalStore = useEditorStore.temporal;
  const { pastStates, futureStates } = temporalStore.getState();
  temporalStore.setState({
    pastStates: pastStates.map(withImage),
    futureStates: futureStates.map(withImage),
  });
  if (activeGesture) {
    activeGesture = {
      baselineScene: { ...activeGesture.baselineScene, image },
      pastStatesBefore: activeGesture.pastStatesBefore.map(withImage),
    };
  }
}

/** Applies a scene.image change without recording a history entry. */
function setImageUntracked(
  set: (
    partial:
      Partial<EditorStore> | ((state: EditorStore) => Partial<EditorStore>),
  ) => void,
  patch: (state: EditorStore) => Partial<EditorStore>,
) {
  const history = useEditorStore.temporal.getState();
  const wasTracking = history.isTracking;
  history.pause();
  set(patch);
  if (wasTracking) history.resume();
  syncImageAcrossHistory(useEditorStore.getState().scene.image);
}

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      scene: createDefaultScene(),
      imageUrl: null,
      imageElement: null,
      imageBlob: null,
      postText: "",
      setPostText: (value) =>
        set((state) => ({
          postText: typeof value === "function" ? value(state.postText) : value,
        })),
      imageError: null,
      setScene: (updater, options) => {
        if (options?.transient) {
          if (!activeGesture) {
            const history = useEditorStore.temporal.getState();
            activeGesture = {
              baselineScene: get().scene,
              pastStatesBefore: [...history.pastStates],
            };
            history.pause();
          }
        } else if (activeGesture) {
          // A discrete edit while a gesture is open (e.g. the gesture's commit
          // never fired) — close the gesture first so history isn't stuck.
          finalizeGesture(get().scene);
        }
        set((state) => ({ scene: updater(state.scene) }));
      },
      addLayer: (layer, index) => {
        if (get().scene.layers.length >= MAX_LAYERS) return;
        get().setScene((scene) => {
          const at =
            index === undefined
              ? scene.layers.length
              : Math.max(0, Math.min(index, scene.layers.length));
          const layers = scene.layers.slice();
          layers.splice(at, 0, layer);
          return { ...scene, layers };
        });
        useUiStore.getState().selectLayer(layer.id);
      },
      updateLayer: (id, updater, options) => {
        get().setScene((scene) => {
          const index = scene.layers.findIndex((layer) => layer.id === id);
          if (index === -1) return scene;
          const current = scene.layers[index];
          const updated = updater(current);
          // id / kind fix rakhna selection aur rendering contract ke liye zaroori hai.
          if (
            updated === current ||
            updated.id !== current.id ||
            updated.kind !== current.kind
          ) {
            return scene;
          }
          const layers = scene.layers.slice();
          layers[index] = updated;
          return { ...scene, layers };
        }, options);
      },
      removeLayer: (id) => {
        if (!get().scene.layers.some((layer) => layer.id === id)) return;
        get().setScene((scene) => ({
          ...scene,
          layers: scene.layers.filter((layer) => layer.id !== id),
        }));
        if (useUiStore.getState().selectedLayerId === id)
          useUiStore.getState().selectLayer(null);
      },
      reorderLayer: (id, toIndex) => {
        get().setScene((scene) => {
          const from = scene.layers.findIndex((layer) => layer.id === id);
          if (from === -1) return scene;
          const to = Math.max(0, Math.min(toIndex, scene.layers.length - 1));
          if (from === to) return scene;
          const layers = scene.layers.slice();
          const [layer] = layers.splice(from, 1);
          layers.splice(to, 0, layer);
          return { ...scene, layers };
        });
      },
      commitScene: () => {
        finalizeGesture(get().scene);
      },
      replaceScene: (scene) => {
        activeGesture = null;
        useUiStore.getState().selectLayer(null);
        const previousUrl = get().imageUrl;
        set({
          scene,
          imageUrl: null,
          imageElement: null,
          imageBlob: null,
          postText: "",
          imageError: null,
        });
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        const history = useEditorStore.temporal.getState();
        history.clear();
        history.resume();
      },
      setImage: (element, url, name, blob, options) => {
        const previousUrl = get().imageUrl;
        setImageUntracked(set, (state) => ({
          imageUrl: url,
          imageElement: element,
          imageBlob: blob ?? null,
          imageError: null,
          scene: {
            ...state.scene,
            layers: options?.clearLayers ? [] : state.scene.layers,
            image: options?.restore
              ? {
                  ...options.restore,
                  width: element.naturalWidth,
                  height: element.naturalHeight,
                }
              : {
                  path: `local/${name}`,
                  width: element.naturalWidth,
                  height: element.naturalHeight,
                  crop: { x: 0, y: 0, w: 1, h: 1 },
                },
          },
        }));
        if (options?.clearLayers) {
          useUiStore.getState().selectLayer(null);
          const history = useEditorStore.temporal.getState();
          history.clear();
          history.resume();
        }
        if (previousUrl && previousUrl !== url)
          URL.revokeObjectURL(previousUrl);
      },
      clearImage: () => {
        const previousUrl = get().imageUrl;
        setImageUntracked(set, (state) => ({
          imageUrl: null,
          imageElement: null,
          imageBlob: null,
          imageError: null,
          scene: { ...state.scene, image: null },
        }));
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      },
      setImageError: (message) => set({ imageError: message }),
    }),
    {
      limit: HISTORY_LIMIT,
      partialize: (state) => ({ scene: state.scene }),
      // Only record an entry when the scene actually changed (skips
      // setImageError and other non-scene updates).
      equality: (pastState, currentState) =>
        pastState.scene === currentState.scene,
    },
  ),
);

export function undoEditor() {
  finalizeGesture(useEditorStore.getState().scene);
  useEditorStore.temporal.getState().undo();
}

export function redoEditor() {
  finalizeGesture(useEditorStore.getState().scene);
  useEditorStore.temporal.getState().redo();
}
