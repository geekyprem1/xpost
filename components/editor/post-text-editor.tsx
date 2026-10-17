"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bold,
  Check,
  CornerDownLeft,
  Italic,
  List,
  ListOrdered,
  Pencil,
  RemoveFormatting,
  Smile,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  containsUnicodeFormatting,
  formatPostSelection,
  type PostFormat,
} from "@/lib/editor/unicode-format";

interface PostTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  defaultEditing?: boolean;
  onDone?: () => void;
}

interface TextSelection {
  start: number;
  end: number;
}

const FORMAT_BUTTONS = [
  { format: "bold", label: "Bold", icon: Bold },
  { format: "italic", label: "Italic", icon: Italic },
  { format: "boldItalic", label: "Bold italic", icon: Bold },
  { format: "underline", label: "Underline", icon: Underline },
  { format: "strike", label: "Strikethrough", icon: Strikethrough },
  { format: "upper", label: "Uppercase", icon: ArrowUpAZ },
  { format: "lower", label: "Lowercase", icon: ArrowDownAZ },
  { format: "bullets", label: "Bulleted list", icon: List },
  { format: "numbered", label: "Numbered list", icon: ListOrdered },
] as const;

const EMOJIS = [
  { text: "😀", label: "Grinning face" },
  { text: "😊", label: "Smiling face" },
  { text: "😂", label: "Face with tears of joy" },
  { text: "🤔", label: "Thinking face" },
  { text: "❤️", label: "Red heart" },
  { text: "👏", label: "Clapping hands" },
  { text: "🙌", label: "Raised hands" },
  { text: "👍", label: "Thumbs up" },
  { text: "✨", label: "Sparkles" },
  { text: "🔥", label: "Fire" },
  { text: "🚀", label: "Rocket" },
  { text: "🎉", label: "Party popper" },
] as const;

const TOOL_BUTTON_CLASS =
  "size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary";

const SHORTCUT_FORMATS: Readonly<Record<string, PostFormat | undefined>> = {
  b: "bold",
  i: "italic",
  u: "underline",
};

export function PostTextEditor({
  value,
  onChange,
  disabled = false,
  label = "Post text",
  defaultEditing = false,
  onDone,
}: PostTextEditorProps) {
  const id = useId();
  const textareaId = `${id}-text`;
  const hintId = `${id}-hint`;
  const warningId = `${id}-warning`;
  const emojiId = `${id}-emoji`;
  const [editing, setEditing] = useState(defaultEditing);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const firstEmojiRef = useRef<HTMLButtonElement>(null);
  const composingRef = useRef(false);
  const selectionRef = useRef<TextSelection>({
    start: value.length,
    end: value.length,
  });
  const pendingSelectionRef = useRef<TextSelection | null>(null);
  const pendingEmojiFocusRef = useRef(false);
  const formatted = containsUnicodeFormatting(value);

  function restoreSelection(selection: TextSelection) {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(selection.start, selection.end);
  }

  // Only an explicit edit/format action requests focus, never an incoming AI update.
  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current;
    if (disabled) {
      pendingSelectionRef.current = null;
      return;
    }
    if (!pending || !editing) return;
    pendingSelectionRef.current = null;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(pending.start, pending.end);
  }, [value, editing, disabled]);

  useEffect(() => {
    if (!emojiOpen || disabled) {
      pendingEmojiFocusRef.current = false;
      return;
    }
    if (pendingEmojiFocusRef.current) {
      pendingEmojiFocusRef.current = false;
      firstEmojiRef.current?.focus();
    }
  }, [emojiOpen, disabled]);

  function rememberSelection() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function currentSelection(): TextSelection {
    if (document.activeElement === textareaRef.current) rememberSelection();
    const start = Math.min(selectionRef.current.start, value.length);
    return {
      start,
      end: Math.max(start, Math.min(selectionRef.current.end, value.length)),
    };
  }

  function commit(text: string, selection: TextSelection) {
    selectionRef.current = selection;
    setEmojiOpen(false);
    if (text === value) {
      restoreSelection(selection);
      return;
    }
    pendingSelectionRef.current = selection;
    onChange(text);
  }

  function applyFormat(format: PostFormat) {
    if (disabled || composingRef.current) return;
    const { start, end } = currentSelection();
    const result = formatPostSelection(value, start, end, format);
    commit(result.text, { start: result.start, end: result.end });
  }

  function insertText(text: string) {
    if (disabled || composingRef.current) return;
    const { start, end } = currentSelection();
    const caret = start + text.length;
    commit(value.slice(0, start) + text + value.slice(end), {
      start: caret,
      end: caret,
    });
  }

  function onTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      disabled ||
      composingRef.current ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }
    const format = SHORTCUT_FORMATS[event.key.toLowerCase()];
    if (!format) return;
    event.preventDefault();
    applyFormat(format);
  }

  function toggleEditing() {
    if (disabled) return;
    setEmojiOpen(false);
    if (editing) {
      rememberSelection();
      pendingSelectionRef.current = null;
      setEditing(false);
      onDone?.();
    } else {
      pendingSelectionRef.current = currentSelection();
      setEditing(true);
    }
  }

  return (
    <div className="mt-3 max-w-full min-w-0 space-y-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={editing ? textareaId : undefined}
          className="text-muted-foreground text-xs font-medium"
        >
          {label}
        </label>
        <Button
          type="button"
          variant={editing ? "secondary" : "ghost"}
          className="min-h-11 gap-2 px-3 text-xs"
          disabled={disabled}
          onClick={toggleEditing}
        >
          {editing ? <Check aria-hidden /> : <Pencil aria-hidden />}
          {editing ? "Done" : "Edit post"}
        </Button>
      </div>

      {editing ? (
        <div className="min-w-0 space-y-3">
          <div
            role="group"
            aria-label="Post formatting"
            className="bg-muted/40 flex min-w-0 flex-wrap gap-2 rounded-xl border p-2"
            onMouseDown={(event) => {
              // Keep the textarea selection when clicking a formatting control.
              if (event.button === 0) event.preventDefault();
            }}
          >
            {FORMAT_BUTTONS.map(
              ({ format, label: buttonLabel, icon: Icon }) => (
                <Button
                  key={format}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={TOOL_BUTTON_CLASS}
                  aria-label={buttonLabel}
                  title={buttonLabel}
                  disabled={disabled}
                  onClick={() => applyFormat(format)}
                >
                  <Icon
                    aria-hidden
                    className={
                      format === "boldItalic" ? "-skew-x-12" : undefined
                    }
                  />
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={TOOL_BUTTON_CLASS}
              aria-label="Insert line break"
              title="Insert line break"
              disabled={disabled}
              onClick={() => insertText("\n")}
            >
              <CornerDownLeft aria-hidden />
            </Button>
            <Button
              ref={emojiTriggerRef}
              type="button"
              variant="ghost"
              size="icon"
              className={TOOL_BUTTON_CLASS}
              aria-label="Insert emoji"
              aria-expanded={emojiOpen && !disabled}
              aria-controls={emojiId}
              title="Insert emoji"
              disabled={disabled}
              onClick={() => {
                pendingEmojiFocusRef.current = !emojiOpen;
                setEmojiOpen((open) => !open);
              }}
            >
              <Smile aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={TOOL_BUTTON_CLASS}
              aria-label="Clear formatting"
              title="Clear formatting"
              disabled={disabled}
              onClick={() => applyFormat("clear")}
            >
              <RemoveFormatting aria-hidden />
            </Button>
          </div>
          <textarea
            ref={textareaRef}
            id={textareaId}
            aria-label={label}
            aria-describedby={formatted ? `${hintId} ${warningId}` : hintId}
            value={value}
            disabled={disabled}
            rows={5}
            placeholder="Write your post here…"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 block min-h-36 w-full max-w-full min-w-0 resize-y rounded-xl border px-3 py-3 text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
            onChange={(event) => {
              if (disabled) return;
              rememberSelection();
              onChange(event.currentTarget.value);
            }}
            onSelect={rememberSelection}
            onBlur={rememberSelection}
            onKeyDown={onTextareaKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
              rememberSelection();
            }}
          />

          {emojiOpen && !disabled ? (
            <div
              id={emojiId}
              role="group"
              aria-label="Choose an emoji"
              className="bg-background min-w-0 space-y-2 rounded-xl border p-3"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                setEmojiOpen(false);
                emojiTriggerRef.current?.focus();
              }}
            >
              <p className="text-muted-foreground text-xs">
                Choose an emoji · Esc to close
              </p>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((emoji, index) => (
                  <Button
                    key={emoji.label}
                    ref={index === 0 ? firstEmojiRef : undefined}
                    type="button"
                    variant="ghost"
                    className="hover:bg-primary/10 size-11 min-h-11 min-w-11 text-xl"
                    aria-label={emoji.label}
                    title={emoji.label}
                    onClick={() => insertText(emoji.text)}
                  >
                    <span aria-hidden>{emoji.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <p
            id={hintId}
            className="text-muted-foreground text-xs leading-relaxed"
          >
            Select text to format just those words. With nothing selected,
            styles apply to the whole post and lists apply to the current line.
          </p>
        </div>
      ) : (
        <p className="text-foreground max-w-full min-w-0 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
          {value || (
            <span className="text-muted-foreground">
              Your post preview will appear here.
            </span>
          )}
        </p>
      )}

      {formatted ? (
        <p
          id={warningId}
          className="text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-xs leading-relaxed"
        >
          Unicode styling carries over to X, but can be harder for screen
          readers to read and may affect search.
        </p>
      ) : null}
    </div>
  );
}
