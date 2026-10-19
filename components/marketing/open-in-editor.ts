"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { savePendingImage, savePendingLook } from "@/lib/editor/handoff";

/** Navigation helpers that hand a pick from the landing page to /editor. */
export function useOpenInEditor() {
  const router = useRouter();

  const openWithLook = useCallback(
    (lookId: string) => {
      savePendingLook(lookId);
      router.push("/editor");
    },
    [router],
  );

  const openWithImage = useCallback(
    async (file: File) => {
      await savePendingImage(file);
      router.push("/editor");
    },
    [router],
  );

  return { openWithLook, openWithImage };
}
