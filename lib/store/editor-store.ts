import { create } from "zustand";
import { temporal } from "zundo";
import { createDefaultScene, type Scene } from "@/lib/scene";

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
  imageError: string | null;
  setScene: (updater: (scene: Scene) => Scene, options?: SetSceneOptions) => void;
  commitScene: () => void;
  replaceScene: (scene: Scene) => void;
  setImage: (element: HTMLImageElement, url: string, name: string) => void;
  clearImage: () => void;
  setImageError: (message: string | null) => void;
};

let activeGesture: Gesture | null = null;

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      scene: createDefaultScene(),
      imageUrl: null,
      imageElement: null,
      imageError: null,
      setScene: (updater, options) => {
        const history = useEditorStore.temporal.getState();
        if (options?.transient) {
          if (!activeGesture) {
            activeGesture = {
              baselineScene: get().scene,
              pastStatesBefore: [...history.pastStates],
            };
            history.pause();
          }
        }
        set((state) => ({ scene: updater(state.scene) }));
      },
      commitScene: () => {
        set((state) => ({ scene: { ...state.scene } }));
        if (activeGesture) {
          const history = useEditorStore.temporal.getState();
          const pinned = [
            ...activeGesture.pastStatesBefore,
            { scene: activeGesture.baselineScene },
          ].slice(-HISTORY_LIMIT);
          useEditorStore.temporal.setState({ pastStates: pinned, futureStates: [] });
          activeGesture = null;
          history.resume();
        }
      },
      replaceScene: (scene) => {
        activeGesture = null;
        set({ scene, imageUrl: null, imageElement: null, imageError: null });
        const history = useEditorStore.temporal.getState();
        history.clear();
        history.resume();
      },
      setImage: (element, url, name) => {
        const previousUrl = get().imageUrl;
        set((state) => ({
          imageUrl: url,
          imageElement: element,
          imageError: null,
          scene: {
            ...state.scene,
            image: {
              path: `local/${name}`,
              width: element.naturalWidth,
              height: element.naturalHeight,
            },
          },
        }));
        if (previousUrl && previousUrl !== url) URL.revokeObjectURL(previousUrl);
      },
      clearImage: () => {
        const previousUrl = get().imageUrl;
        set((state) => ({
          imageUrl: null,
          imageElement: null,
          imageError: null,
          scene: { ...state.scene, image: null },
        }));
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      },
      setImageError: (message) =>
        set({ imageError: message }),
    }),
    {
      limit: HISTORY_LIMIT,
      partialize: (state) => ({ scene: state.scene }),
    }
  )
);

export function undoEditor() {
  useEditorStore.temporal.getState().undo();
}

export function redoEditor() {
  useEditorStore.temporal.getState().redo();
}
