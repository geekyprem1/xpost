"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectSessionStore } from "@/lib/projects/project-store";

/** PJ-4: cloud copy changed elsewhere — user picks which version wins. */
export function ProjectConflictDialog() {
  const conflict = useProjectSessionStore((state) => state.conflict);
  const message = useProjectSessionStore((state) => state.message);
  const resolve = useProjectSessionStore((state) => state.resolveConflict);

  return (
    // No dismiss without a choice: closing would leave saving paused.
    <Dialog open={conflict !== null && resolve !== null}>
      <DialogContent
        className="max-w-md rounded-2xl"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogTitle>Two versions of this project</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
        <p className="text-muted-foreground mt-2 text-xs">
          Keeping this browser&apos;s version overwrites the cloud copy. Using
          the cloud version discards the changes made here.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => resolve?.("cloud")}>
            Use cloud version
          </Button>
          <Button onClick={() => resolve?.("local")}>
            Keep this browser&apos;s version
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
