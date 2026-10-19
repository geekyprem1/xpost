"use client";

import { RightPanel } from "@/components/editor/right-panel";

export function V2AiDrawer({
  open,
  onClose,
  previewImage,
  previewBusy,
  onCapturePreview,
}: {
  open: boolean;
  onClose: () => void;
  previewImage: string | null;
  previewBusy: boolean;
  onCapturePreview: () => Promise<string | null>;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close AI Post Studio"
        className="absolute inset-0 z-20 cursor-default bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="v2-ai-drawer absolute inset-y-0 right-0 z-30">
        <RightPanel
          open
          onClose={onClose}
          previewImage={previewImage}
          previewBusy={previewBusy}
          onCapturePreview={onCapturePreview}
        />
      </div>
    </>
  );
}
