"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Download, Redo2, Undo2, User } from "lucide-react";
import { useStore } from "zustand";
import { DownloadModal } from "@/components/editor/download-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchCredits } from "@/lib/api/credits";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { redoEditor, undoEditor, useEditorStore } from "@/lib/store";
import { useCreditsStore } from "@/lib/store/credits-store";

export function V2TopBar({
  aiOpen,
  onToggleAi,
  draftReady,
  draftError,
}: {
  aiOpen: boolean;
  onToggleAi: () => void;
  draftReady: boolean;
  draftError: string | null;
}) {
  const router = useRouter();
  const hasImage = useEditorStore((state) => state.scene.image !== null);
  const canUndo = useStore(
    useEditorStore.temporal,
    (state) => state.pastStates.length > 0,
  );
  const canRedo = useStore(
    useEditorStore.temporal,
    (state) => state.futureStates.length > 0,
  );
  const credits = useCreditsStore((state) => state.credits);
  const [email, setEmail] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    void fetchCredits()
      .then((info) => {
        if (info)
          useCreditsStore.getState().setCredits(info.credits, info.resetAt);
      })
      .catch(() => undefined);
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => undefined);
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-card/70 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold"
          aria-label="Shotlark home"
        >
          <Image
            src="/logos/shotlark-flight.svg"
            width={28}
            height={28}
            alt=""
            className="size-7"
          />
          <span className="hidden sm:inline">Shotlark</span>
        </Link>
        <span className="bg-border h-6 w-px shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold">
              Screenshot studio
            </span>
            <span className="border-primary/30 bg-primary/10 text-primary rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase">
              V2
            </span>
          </div>
          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span
              className={`size-1.5 rounded-full ${
                draftError
                  ? "bg-destructive"
                  : draftReady
                    ? "bg-emerald-400"
                    : "bg-muted-foreground animate-pulse"
              }`}
              aria-hidden
            />
            {draftError
              ? "Draft error"
              : draftReady
                ? "Saved locally"
                : "Restoring draft…"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden sm:inline-flex"
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          onClick={undoEditor}
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden sm:inline-flex"
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          onClick={redoEditor}
        >
          <Redo2 aria-hidden />
        </Button>
        <Badge variant="secondary" className="mx-1 hidden sm:inline-flex">
          {credits === null ? "…" : `${credits} credits`}
          <span className="sr-only"> remaining</span>
        </Badge>
        <Button
          variant={aiOpen ? "secondary" : "outline"}
          size="sm"
          type="button"
          aria-pressed={aiOpen}
          onClick={onToggleAi}
        >
          <Bot aria-hidden />
          <span className="hidden md:inline">AI Studio</span>
        </Button>
        <Button
          size="sm"
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!hasImage}
          aria-label="Export"
          onClick={() => setDownloadOpen(true)}
        >
          <Download aria-hidden />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <DownloadModal open={downloadOpen} onOpenChange={setDownloadOpen} />
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden lg:inline-flex"
        >
          <Link href="/editor" title="Switch to the classic editor">
            <ArrowLeft aria-hidden />
            Classic
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Account menu"
            >
              <Avatar size="sm">
                <AvatarFallback>
                  <User aria-hidden />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="max-w-48 truncate">
              {email ?? "Guest"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">Account</Link>
            </DropdownMenuItem>
            {email ? (
              <DropdownMenuItem onSelect={() => void signOut()}>
                Sign out
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
