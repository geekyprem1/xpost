"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Sparkles, User, Undo2, Redo2 } from "lucide-react";
import { useStore } from "zustand";
import { useEditorStore, undoEditor, redoEditor } from "@/lib/store";
import { fetchCredits } from "@/lib/api/credits";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { DownloadModal } from "@/components/editor/download-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useCreditsStore } from "@/lib/store/credits-store";

export function TopBar() {
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
  const [email, setEmail] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const credits = useCreditsStore((state) => state.credits);

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
      .then(({ data }) => {
        setEmail(data.user?.email ?? null);
      })
      .catch(() => undefined);
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="studio-header flex shrink-0 items-center justify-between">
      <div className="studio-brand-group">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
          aria-label="Shotlark home"
        >
          <span className="studio-brand-icon">
            <Sparkles className="size-5" aria-hidden />
          </span>
          Shotlark
        </Link>
        <span className="studio-header-divider" />
        <span className="studio-project">
          Screenshot studio <span>Personal workspace</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className={hasImage ? "hidden sm:inline-flex" : "hidden"}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          onClick={undoEditor}
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          onClick={redoEditor}
        >
          <Redo2 aria-hidden />
        </Button>
        <Badge variant="secondary">
          {credits === null ? "Loading" : `${credits} credits`}
          <span className="sr-only"> remaining</span>
        </Badge>
        <Button
          variant="default"
          size="sm"
          type="button"
          className="studio-export h-9 rounded-xl px-3"
          disabled={!hasImage}
          aria-label="Download"
          onClick={() => setDownloadOpen(true)}
        >
          <Download aria-hidden />
          Download
        </Button>
        <DownloadModal open={downloadOpen} onOpenChange={setDownloadOpen} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={hasImage ? "icon" : "sm"}
              className={
                !hasImage
                  ? "empty-account bg-background/70 h-9 gap-2 rounded-full border px-2"
                  : undefined
              }
              type="button"
              aria-label="Account menu"
            >
              <Avatar size="sm">
                <AvatarFallback>
                  <User aria-hidden />
                </AvatarFallback>
              </Avatar>
              {!hasImage ? (
                <span className="hidden max-w-36 truncate text-xs sm:block">
                  {email?.split("@")[0] ?? "Account"}
                </span>
              ) : null}
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
