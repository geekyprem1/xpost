"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/lib/store";
import {
  IMAGE_ACCEPT,
  firstImageFromList,
  loadImageFromFile,
  validateImageFile,
} from "./load";

export function useImageActions() {
  const setImage = useEditorStore((state) => state.setImage);
  const clearImage = useEditorStore((state) => state.clearImage);
  const setImageError = useEditorStore((state) => state.setImageError);

  const loadFile = useCallback(
    async (file: File) => {
      const error = validateImageFile(file);
      if (error) {
        setImageError(error);
        return;
      }
      try {
        const { element, url } = await loadImageFromFile(file);
        setImage(element, url, file.name);
      } catch (reason) {
        setImageError(
          reason instanceof Error
            ? reason.message
            : "Unable to load the image.",
        );
      }
    },
    [setImage, setImageError],
  );

  const openPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_ACCEPT;
    input.onchange = () => {
      const file = firstImageFromList(input.files);
      if (file) void loadFile(file);
    };
    input.click();
  }, [loadFile]);

  const loadFromDataTransfer = useCallback(
    (data: DataTransfer | null): boolean => {
      const file = firstImageFromList(data?.files ?? null);
      if (!file) return false;
      void loadFile(file);
      return true;
    },
    [loadFile],
  );

  return {
    openPicker,
    loadFile,
    loadFromDataTransfer,
    removeImage: clearImage,
  };
}
