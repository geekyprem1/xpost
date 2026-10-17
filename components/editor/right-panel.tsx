"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LivePostPreview } from "@/components/editor/live-post-preview";
import { PostTextEditor } from "@/components/editor/post-text-editor";
import { useEditorStore } from "@/lib/store";
import {
  BadgeCheck,
  Pencil,
  BarChart2,
  Bookmark,
  Bot,
  Copy,
  Download,
  ExternalLink,
  Heart,
  Loader2,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share,
  Shrink,
  Sparkles,
  StretchHorizontal,
  X,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePost, refinePost } from "@/lib/api/ai";
import {
  REFINE_ACTIONS,
  REFINE_ACTION_LABELS,
  type RefineAction,
} from "@/lib/editor/refine-actions";
import {
  analyzePostText,
  X_LONG_POST_LIMIT,
  X_WEIGHTED_LIMIT,
} from "@/lib/editor/post-text";
import {
  blobToPng,
  buildXIntentUrl,
  dataUrlToBlob,
} from "@/lib/editor/x-share";
import { useCreditsStore } from "@/lib/store/credits-store";

type ChatMessage = { role: "user" | "assistant"; content: string };

function PreviewIdentity({ email }: { email: string | null }) {
  const handle = email?.split("@")[0] || "you";
  const name = handle.charAt(0).toUpperCase() + handle.slice(1);
  return (
    <>
      <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {name.charAt(0)}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        <span
          className="max-w-[42%] min-w-0 truncate font-semibold"
          title={email ?? name}
        >
          {name}
        </span>
        <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-hidden />
        <span
          className="text-muted-foreground min-w-0 flex-1 truncate"
          title={`@${handle}`}
        >
          @{handle}
        </span>
        <span className="text-muted-foreground shrink-0">· now</span>
      </span>
    </>
  );
}

function formatResetDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RightPanel({
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
  const hasScreenshot = useEditorStore((state) =>
    Boolean(state.scene.image && state.imageElement),
  );
  const videoBackground = useEditorStore(
    (state) => state.scene.background.kind === "video",
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [longPost, setLongPost] = useState(false);
  const runRef = useRef(0);
  const actionRef = useRef(false);
  const streamRef = useRef(false);
  const resetAt = useCreditsStore((state) => state.resetAt);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user.email ?? null);
    });
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setEmail(data.user?.email ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [open]);

  if (!open) return null;

  const limit = longPost ? X_LONG_POST_LIMIT : X_WEIGHTED_LIMIT;
  const stats = analyzePostText(postText, limit);

  function flash(message: string) {
    setNote(message);
    setTimeout(() => setNote(null), 2500);
  }

  async function runStream(
    label: string,
    start: (
      onDelta: (delta: string) => void,
    ) => Promise<
      | { ok: true; text: string; credits: number | null }
      | { ok: false; code: string; message: string }
    >,
    options: { clear: boolean; restoreOnError?: string },
  ): Promise<string | null> {
    if (streamRef.current) return null;
    streamRef.current = true;
    const run = runRef.current + 1;
    runRef.current = run;
    setBusy(true);
    setPhase(label);
    setError(null);
    setLimitReached(false);
    if (options.clear) setPostText("");
    try {
      const outcome = await start((delta) => {
        if (runRef.current !== run) return;
        setPostText((current) => current + delta);
      });
      if (runRef.current !== run) return null;
      if (!outcome.ok) {
        if (options.restoreOnError !== undefined) {
          setPostText(options.restoreOnError);
        }
        if (outcome.code === "INSUFFICIENT_CREDITS") {
          setLimitReached(true);
          useCreditsStore.getState().setCredits(0);
        }
        setError(outcome.message);
        return null;
      }
      if (outcome.credits !== null) {
        useCreditsStore.getState().setCredits(outcome.credits);
      }
      setPostText(outcome.text);
      return outcome.text;
    } catch (reason) {
      if (runRef.current === run) {
        if (options.restoreOnError !== undefined)
          setPostText(options.restoreOnError);
        setError(
          reason instanceof Error
            ? reason.message
            : "Something went wrong. Please try again.",
        );
      }
      return null;
    } finally {
      streamRef.current = false;
      if (runRef.current === run) {
        setBusy(false);
        setPhase(null);
      }
    }
  }

  async function onGenerate() {
    if (busy || actionRef.current || !hasScreenshot) return;
    actionRef.current = true;
    try {
      const image = await onCapturePreview();
      if (!image) {
        setError("Unable to capture the post image. Please try again.");
        return;
      }
      await runStream(
        "Generate",
        (onDelta) =>
          generatePost({ prompt: prompt.trim() || undefined, image }, onDelta),
        { clear: true, restoreOnError: postText },
      );
    } finally {
      actionRef.current = false;
    }
  }

  async function onRefine(action: RefineAction) {
    if (busy || postText.trim().length === 0) return;
    await runStream(
      REFINE_ACTION_LABELS[action],
      (onDelta) => refinePost({ currentText: postText, action }, onDelta),
      { clear: true, restoreOnError: postText },
    );
  }

  async function onChat() {
    const request = chatInput.trim();
    if (busy || request.length === 0) return;
    const history = messages.slice(-10);
    setChatInput("");
    setMessages((current) =>
      [...current, { role: "user" as const, content: request }].slice(-10),
    );
    const text = await runStream(
      "Chat",
      (onDelta) =>
        refinePost(
          { currentText: postText, freeform: request, history },
          onDelta,
        ),
      { clear: true, restoreOnError: postText },
    );
    if (text) {
      setMessages((current) =>
        [...current, { role: "assistant" as const, content: text }].slice(-10),
      );
    }
  }

  async function onCopy() {
    if (postText.trim().length === 0) return;
    try {
      await navigator.clipboard.writeText(postText);
      flash("Post text copied. Paste it into your X post.");
    } catch {
      setError("Copy failed. Check your browser clipboard permissions.");
    }
  }

  function onOpenX() {
    if (postText.trim().length === 0) return;
    window.open(buildXIntentUrl(postText), "_blank", "noopener,noreferrer");
  }

  async function onCopyImage() {
    if (!previewImage) return;
    try {
      const png = await blobToPng(dataUrlToBlob(previewImage));
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      flash("Image copied. Paste it into your X post.");
    } catch {
      setError(
        "Image copy failed. Download the image and attach it to your post.",
      );
    }
  }

  function onDownloadImage() {
    if (!previewImage) return;
    const anchor = document.createElement("a");
    anchor.href = previewImage;
    anchor.download = "shotlark-post.jpg";
    anchor.click();
    flash("Image downloaded. Attach it to your X post.");
  }

  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <aside
        aria-label="AI Post Studio"
        className={`ai-studio bg-background absolute inset-y-0 right-0 z-20 flex w-full shrink-0 flex-col border-l shadow-2xl md:static md:shadow-none ${expanded ? "md:w-[min(30rem,45vw)]" : "md:w-[min(25rem,40vw)]"}`}
      >
        <div className="ai-studio-header flex shrink-0 items-center justify-between border-b px-5">
          <span className="ai-studio-heading">
            <Bot className="size-4" aria-hidden />
            <span>
              AI Post Studio<small>From screenshot to story.</small>
            </span>
          </span>
          <span className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Post text copy"
              onClick={() => void onCopy()}
            >
              <Copy aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label={expanded ? "Shrink panel" : "Expand panel"}
              aria-pressed={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <Shrink aria-hidden />
              ) : (
                <StretchHorizontal aria-hidden />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Close AI Post Studio"
              onClick={onClose}
            >
              <X aria-hidden />
            </Button>
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="ai-section-caption">
            <span>X Preview</span>
            <span className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="tracking-normal normal-case"
                disabled={busy}
                aria-expanded={editorOpen}
                onClick={() => setEditorOpen((value) => !value)}
              >
                <Pencil aria-hidden />
                {editorOpen ? "Close editor" : "Edit & format"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Copy post text"
                disabled={!postText.trim()}
                onClick={() => void onCopy()}
              >
                <Copy aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Refresh preview"
                disabled={previewBusy || !hasScreenshot}
                onClick={() => void onCapturePreview()}
              >
                <RefreshCw
                  className={previewBusy ? "animate-spin" : ""}
                  aria-hidden
                />
              </Button>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Expand post preview"
                  title="Expand post preview"
                >
                  <Maximize2 aria-hidden />
                </Button>
              </DialogTrigger>
            </span>
          </div>
          {editorOpen ? (
            <div className="rounded-2xl border p-3">
              <PostTextEditor
                value={postText}
                onChange={setPostText}
                disabled={busy}
                defaultEditing
                onDone={() => setEditorOpen(false)}
              />
            </div>
          ) : null}
          <div
            className="bg-background rounded-2xl border p-4"
            aria-label="X preview"
          >
            <div className="flex items-start gap-2">
              <PreviewIdentity email={email} />
              <MoreHorizontal
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </div>

            <div className="ml-12">
              <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                {postText || (
                  <span className="text-muted-foreground">
                    Your post will appear here. Tap Generate post, then refine
                    it with the AI chat.
                  </span>
                )}
              </p>

              {!hasScreenshot ? (
                <div className="text-muted-foreground mt-3 flex h-40 items-center justify-center rounded-xl border border-dashed p-5 text-center text-sm">
                  Upload or capture a screenshot to preview your post.
                </div>
              ) : videoBackground ? (
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="focus-visible:outline-ring block w-full cursor-zoom-in rounded-xl text-left focus-visible:outline-2"
                    aria-label="Open post preview"
                  >
                    <LivePostPreview />
                  </button>
                </DialogTrigger>
              ) : previewBusy && !previewImage ? (
                <div className="bg-muted/40 mt-2 flex h-40 items-center justify-center rounded-lg border">
                  <Loader2
                    className="text-muted-foreground size-4 animate-spin"
                    aria-hidden
                  />
                </div>
              ) : previewImage ? (
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="focus-visible:outline-ring block w-full cursor-zoom-in rounded-xl focus-visible:outline-2"
                    aria-label="Open post preview"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImage}
                      alt="Rendered post preview. Click to enlarge"
                      className="bg-muted/20 mt-3 max-h-56 w-full rounded-xl border object-contain"
                    />
                  </button>
                </DialogTrigger>
              ) : (
                <button
                  type="button"
                  onClick={() => void onCapturePreview()}
                  className="text-muted-foreground hover:border-ring mt-2 flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-xs"
                >
                  Load preview image
                </button>
              )}

              <div className="text-muted-foreground mt-3 flex items-center justify-between">
                <MessageCircle className="size-4" aria-hidden />
                <Repeat2 className="size-4" aria-hidden />
                <Heart className="size-4" aria-hidden />
                <BarChart2 className="size-4" aria-hidden />
                <Bookmark className="size-4" aria-hidden />
                <Share className="size-4" aria-hidden />
              </div>
            </div>
          </div>

          <div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={busy || postText.trim().length === 0}
                onClick={onOpenX}
              >
                <ExternalLink aria-hidden />
                Open in X
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={postText.trim().length === 0}
                onClick={() => void onCopy()}
              >
                <Copy aria-hidden />
                Copy text
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!hasScreenshot || !previewImage || previewBusy}
                onClick={() => void onCopyImage()}
              >
                <Copy aria-hidden />
                Copy image
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!hasScreenshot || !previewImage}
                onClick={onDownloadImage}
              >
                <Download aria-hidden />
                Download image
              </Button>
            </div>
            {stats.overLimit ? (
              <p className="mt-1.5 text-[11px] text-amber-500">
                Your post exceeds the character limit. Shorten it or enable Long
                post.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
              <span
                className={
                  stats.overLimit ? "text-destructive font-medium" : undefined
                }
                data-testid="post-counter"
              >
                {stats.weightedLength}/
                {limit === X_WEIGHTED_LIMIT ? "280" : "long"}
              </span>
              {stats.hasUrl ? (
                <span className="rounded-sm border px-1 text-[10px]">
                  Link post
                </span>
              ) : null}
              <Button
                type="button"
                size="xs"
                variant={longPost ? "secondary" : "outline"}
                aria-pressed={longPost}
                onClick={() => setLongPost((value) => !value)}
              >
                Long post
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Topic / instruction (optional)"
                aria-label="Generate prompt"
                className="h-10 min-w-0 text-sm"
              />
              <Button
                type="button"
                size="sm"
                className="h-10 rounded-xl px-3"
                disabled={busy || previewBusy || !hasScreenshot}
                onClick={() => void onGenerate()}
              >
                {busy && phase === "Generate" ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Sparkles aria-hidden />
                )}
                Generate
              </Button>
            </div>
            <p className="text-muted-foreground text-[10px]">
              Each AI action uses 1 credit. Credits renew on your reset date.
            </p>
            {limitReached ? (
              <p className="border-destructive/40 text-destructive rounded-lg border p-2 text-[11px]">
                You have used all your AI credits
                {resetAt ? ` — reset ${formatResetDate(resetAt)}` : ""}. Your
                credits will renew then.
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium">
              Quick refine
            </span>
            <div className="flex flex-wrap gap-1">
              {REFINE_ACTIONS.map((action) => (
                <Button
                  key={action}
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={busy || postText.trim().length === 0}
                  onClick={() => void onRefine(action)}
                >
                  {REFINE_ACTION_LABELS[action]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing)
                    void onChat();
                }}
                placeholder="Ask AI to adjust the post…"
                aria-label="Chat with AI"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Send chat"
                disabled={busy || chatInput.trim().length === 0}
                onClick={() => void onChat()}
              >
                <Send aria-hidden />
              </Button>
            </div>
            {messages.length > 0 ? (
              <div
                className="space-y-1 rounded-lg border p-2 text-[11px]"
                aria-label="Chat history"
              >
                {messages.slice(-6).map((message, index) => (
                  <p
                    key={index}
                    className={
                      message.role === "user"
                        ? "text-muted-foreground"
                        : "whitespace-pre-wrap"
                    }
                  >
                    {message.role === "user" ? "You: " : "AI: "}
                    {message.content}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {busy && phase ? (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {phase} — generating…
            </p>
          ) : null}
          {note ? (
            <p
              role="status"
              className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400"
            >
              {note}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg p-3 text-xs"
            >
              {error}
            </p>
          ) : null}
        </div>
      </aside>
      <DialogContent className="bg-background/95 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[680px] overflow-y-auto rounded-3xl border p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <DialogTitle className="mb-3 pr-8 text-sm font-semibold">
          Post preview
        </DialogTitle>
        <DialogDescription className="sr-only">
          Edit and format your post, then copy it or open it in X.
        </DialogDescription>
        <Button
          type="button"
          variant="ghost"
          className="mb-3"
          disabled={busy}
          aria-expanded={editorOpen}
          onClick={() => setEditorOpen((value) => !value)}
        >
          <Pencil aria-hidden />
          {editorOpen ? "Close editor" : "Edit & format"}
        </Button>
        {editorOpen ? (
          <div className="mb-3 rounded-xl border p-3">
            <PostTextEditor
              value={postText}
              onChange={setPostText}
              disabled={busy}
              defaultEditing
              onDone={() => setEditorOpen(false)}
            />
          </div>
        ) : null}
        <article className="bg-background rounded-2xl border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <PreviewIdentity email={email} />
            <MoreHorizontal
              className="text-muted-foreground size-4"
              aria-hidden
            />
          </div>
          <div className="ml-[52px]">
            <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
              {postText || (
                <span className="text-muted-foreground">
                  Your post will appear here. Tap Generate post, then refine it
                  with the AI chat.
                </span>
              )}
            </p>
            {videoBackground ? (
              <LivePostPreview expanded />
            ) : previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt="Full post artwork"
                className="bg-muted/20 mt-3 max-h-[52dvh] w-full rounded-2xl border object-contain"
              />
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No image preview available.
              </p>
            )}
            <div
              className="text-muted-foreground mt-4 flex items-center justify-between"
              aria-hidden
            >
              <MessageCircle className="size-4" />
              <Repeat2 className="size-4" />
              <Heart className="size-4" />
              <BarChart2 className="size-4" />
              <Bookmark className="size-4" />
              <Share className="size-4" />
            </div>
          </div>
        </article>
        <p
          className={`mt-3 text-xs ${stats.overLimit ? "text-destructive" : "text-muted-foreground"}`}
        >
          {stats.weightedLength}/{limit} weighted characters
          {stats.overLimit
            ? " — Shorten your post or enable Long post in the panel."
            : ""}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy || !postText.trim()}
            onClick={() => void onCopy()}
          >
            <Copy aria-hidden />
            Copy post
          </Button>
          <Button disabled={busy || !postText.trim()} onClick={onOpenX}>
            <ExternalLink aria-hidden />
            Open in X
          </Button>
        </div>
        {note ? (
          <p
            role="status"
            className="mt-2 text-xs text-emerald-600 dark:text-emerald-400"
          >
            {note}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive mt-2 text-xs">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
