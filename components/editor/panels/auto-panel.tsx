"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoSceneFromImage } from "@/lib/editor/auto-style";
import { useEditorStore } from "@/lib/store";

export function AutoPanel() {
  const imageElement = useEditorStore((state) => state.imageElement);
  const setScene = useEditorStore((state) => state.setScene);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Automatically match the background, spacing, shadows and corners to your
        screenshot. No credits required.
      </p>
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={!imageElement}
        title={imageElement ? undefined : "Upload a screenshot first"}
        onClick={() => {
          if (!imageElement) return;
          setScene((scene) => autoSceneFromImage(scene, imageElement));
        }}
      >
        <Sparkles aria-hidden />
        Auto style
      </Button>
    </div>
  );
}
