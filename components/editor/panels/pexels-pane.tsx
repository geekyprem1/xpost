"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Play, Search, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchMedia,
  type MediaProviderId,
  type MediaSearchItem,
} from "@/lib/api/pexels";
import { useEditorStore } from "@/lib/store";

const SHUFFLE_WORDS: Record<"photo" | "video", string[]> = {
  photo: [
    "gradient",
    "abstract shapes",
    "minimal desk",
    "sky",
    "texture",
    "neon",
  ],
  video: [
    "abstract loop",
    "gradient motion",
    "ocean waves",
    "clouds",
    "city night",
    "rain window",
  ],
};

type Status = "idle" | "loading" | "ready" | "error";

export function PexelsPane({
  defaultKind,
  defaultQuery = "",
  chips = [],
  showKindToggle = false,
}: {
  defaultKind: "photo" | "video";
  defaultQuery?: string;
  chips?: string[];
  showKindToggle?: boolean;
}) {
  const background = useEditorStore((state) => state.scene.background);
  const setScene = useEditorStore((state) => state.setScene);
  const [kind, setKind] = useState<"photo" | "video">(defaultKind);
  const [provider, setProvider] = useState<MediaProviderId>("pixabay");
  const [query, setQuery] = useState(defaultQuery);
  const [items, setItems] = useState<MediaSearchItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef(0);

  const runSearch = useCallback(
    async (searchQuery: string, searchKind: "photo" | "video") => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 2) {
        setStatus("error");
        setMessage("Enter at least 2 characters.");
        return;
      }
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setStatus("loading");
      setMessage(null);
      const outcome = await searchMedia({
        provider,
        query: trimmed,
        type: searchKind,
        page: 1,
        perPage: 24,
        orientation: "landscape",
      });
      if (requestRef.current !== requestId) return;
      if (!outcome.ok) {
        setStatus("error");
        setMessage(outcome.message);
        return;
      }
      setItems(outcome.items);
      setStatus("ready");
      if (outcome.items.length === 0) {
        setMessage("No results found. Try a different search.");
      }
    },
    [provider],
  );

  const activeUrl =
    background.kind === "image" || background.kind === "video"
      ? background.src.url
      : null;
  const activeCredit =
    (background.kind === "image" || background.kind === "video") &&
    (background.src.provider === "pexels" ||
      background.src.provider === "pixabay")
      ? (background.src.credit ?? null)
      : null;

  const footerProvider: MediaProviderId =
    background.kind === "image" || background.kind === "video"
      ? background.src.provider === "pixabay"
        ? "pixabay"
        : background.src.provider === "pexels"
          ? "pexels"
          : provider
      : provider;

  function applyItem(item: MediaSearchItem) {
    const src = {
      provider: item.provider,
      id: item.id,
      url: item.url,
      previewUrl: item.previewUrl,
      credit: item.credit,
    };
    setScene((scene) => ({
      ...scene,
      background:
        item.type === "video"
          ? { kind: "video", src }
          : { kind: "image", src, blur: 0 },
    }));
  }

  function runChip(chip: string) {
    setQuery(chip);
    void runSearch(chip, kind);
  }

  function shuffle() {
    const words = SHUFFLE_WORDS[kind];
    const word = words[Math.floor(Math.random() * words.length)];
    setQuery(word);
    void runSearch(word, kind);
  }

  return (
    <div className="space-y-2 pt-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void runSearch(query, kind);
          }}
          placeholder={
            kind === "video"
              ? "Video — jaise 'ocean waves'"
              : "Photo — jaise 'gradient'"
          }
          aria-label="Pexels search"
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void runSearch(query, kind)}
          aria-label="Search"
        >
          <Search aria-hidden />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={shuffle}
          aria-label="Shuffle"
        >
          <Shuffle aria-hidden />
        </Button>
      </div>

      {showKindToggle ? (
        <div className="flex gap-1">
          {(["photo", "video"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="xs"
              variant={kind === option ? "secondary" : "outline"}
              aria-pressed={kind === option}
              onClick={() => {
                setKind(option);
                setItems([]);
                setStatus("idle");
                setMessage(null);
              }}
            >
              {option === "photo" ? "Photos" : "Videos"}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        {(["pixabay", "pexels"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            size="xs"
            variant={provider === option ? "secondary" : "ghost"}
            aria-pressed={provider === option}
            onClick={() => {
              setProvider(option);
              setItems([]);
              setStatus("idle");
              setMessage(null);
            }}
          >
            {option === "pixabay" ? "Pixabay" : "Pexels"}
          </Button>
        ))}
        {provider === "pexels" ? (
          <span className="text-muted-foreground text-[10px]">
            Pexels search is currently unavailable. Try another media provider.
          </span>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <Button
              key={chip}
              type="button"
              size="xs"
              variant={query === chip ? "secondary" : "outline"}
              onClick={() => runChip(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
      ) : null}

      {status === "idle" ? (
        <p className="text-muted-foreground pt-1 text-xs">
          Choose a suggestion or enter a search term and press Enter.
        </p>
      ) : null}
      {status === "loading" ? (
        <p className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Searching…
        </p>
      ) : null}
      {status === "error" && message ? (
        <p className="text-destructive pt-1 text-xs">{message}</p>
      ) : null}
      {status === "ready" && message ? (
        <p className="text-muted-foreground pt-1 text-xs">{message}</p>
      ) : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => {
            const active = activeUrl === item.url;
            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => applyItem(item)}
                aria-label={`${item.type === "video" ? "Video" : "Photo"} by ${item.credit.name}`}
                aria-pressed={active}
                title={`${item.credit.name} — Pexels`}
                className={`relative overflow-hidden rounded-md border transition-all ${
                  active ? "ring-ring ring-2" : "hover:opacity-85"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
                {item.type === "video" ? (
                  <span className="absolute right-1 bottom-1 rounded-sm bg-black/60 p-0.5 text-white">
                    <Play className="size-3" aria-hidden />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="text-muted-foreground flex items-center justify-between gap-2 text-[10px]">
        <a
          href={
            footerProvider === "pixabay"
              ? "https://pixabay.com"
              : "https://www.pexels.com"
          }
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Provided by {footerProvider === "pixabay" ? "Pixabay" : "Pexels"}
        </a>
        {activeCredit ? (
          <a
            href={activeCredit.url}
            target="_blank"
            rel="noreferrer"
            className="truncate underline"
          >
            {activeCredit.name}
          </a>
        ) : null}
      </div>
    </div>
  );
}
