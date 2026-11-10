"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/lib/store";
import { useBrandStore } from "@/lib/brand/brand-store";
import { useBillingStore } from "@/lib/billing/access-store";
import {
  createShareImageCache,
  renderShareImages,
  type ShareImages,
} from "./share-image";

type Input = {
  scene: ReturnType<typeof useEditorStore.getState>["scene"];
  screenshot: HTMLImageElement | null;
  watermark: unknown;
};

export function useShareImages(open: boolean) {
  const scene = useEditorStore((state) => state.scene);
  const screenshot = useEditorStore((state) => state.imageElement);
  const watermark = useBrandStore((state) => state.kit.watermark);
  const pro = useBillingStore((state) => state.pro);
  const input = useMemo(
    () => ({ scene, screenshot, watermark, pro }),
    [scene, screenshot, watermark, pro],
  );
  const cache = useMemo(
    () =>
      createShareImageCache<Input>(async ({ scene, screenshot }) => {
        if (!screenshot) throw new Error("Upload a screenshot first.");
        return renderShareImages(scene, screenshot);
      }),
    [],
  );
  const [result, setResult] = useState<{
    input: Input;
    images?: ShareImages;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open || !scene.image || !screenshot) return;
    let active = true;
    const timer = setTimeout(() => {
      void cache.get(input).then(
        (images) => {
          if (active) setResult({ input, images });
        },
        (error: unknown) => {
          if (active)
            setResult({
              input,
              error:
                error instanceof Error
                  ? error.message
                  : "Unable to prepare share images.",
            });
        },
      );
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, scene.image, screenshot, input, cache, retry]);

  return {
    images: result?.input === input ? (result.images ?? null) : null,
    error: result?.input === input ? (result.error ?? null) : null,
    retry: () => {
      cache.clear();
      setResult(null);
      setRetry((value) => value + 1);
    },
  };
}
