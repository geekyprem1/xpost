"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  MAX_BRAND_COLORS,
  MAX_SAVED_STYLES,
  MAX_STYLE_NAME,
  MAX_WATERMARK_TEXT,
  applyStyleSnapshot,
  hasCustomWatermark,
  nextStyleName,
  normalizeHexColor,
  styleMatches,
  type SavedStyle,
} from "@/lib/brand/brand-kit";
import { useBrandStore } from "@/lib/brand/brand-store";
import { LOGO_ACCEPT, prepareLogo } from "@/lib/brand/watermark-asset";
import type { WatermarkCorner } from "@/lib/renderer/watermark-placement";
import type { Scene } from "@/lib/scene";
import { useEditorStore } from "@/lib/store";

const CORNERS: { id: WatermarkCorner; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium">{title}</h3>
        {hint ? (
          <span className="text-muted-foreground text-[10px]">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Small CSS swatch of a saved style's background (video / photo → neutral). */
function backgroundPreview(background: Scene["background"]): CSSProperties {
  if (background.kind === "solid") return { background: background.color };
  if (background.kind === "gradient") {
    const stops = background.stops
      .map((stop) => `${stop.color} ${Math.round(stop.at * 100)}%`)
      .join(", ");
    return { background: `linear-gradient(${background.angle}deg, ${stops})` };
  }
  if (background.kind === "image" || background.kind === "video") {
    const url =
      background.src.previewUrl ??
      (background.kind === "image" ? background.src.url : null);
    if (url)
      return {
        backgroundImage: `url("${url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
  }
  return { background: "linear-gradient(135deg, #3b2f80, #0f1020)" };
}

function StyleRow({ item, active }: { item: SavedStyle; active: boolean }) {
  const setScene = useEditorStore((state) => state.setScene);
  const renameStyle = useBrandStore((state) => state.renameStyle);
  const deleteStyle = useBrandStore((state) => state.deleteStyle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);

  function finishRename(save: boolean) {
    if (save) renameStyle(item.id, draft);
    else setDraft(item.name);
    setEditing(false);
  }

  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-md border"
        style={backgroundPreview(item.snapshot.background)}
      />
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            finishRename(true);
          }}
        >
          <Input
            autoFocus
            value={draft}
            maxLength={MAX_STYLE_NAME}
            aria-label={`Rename ${item.name}`}
            className="h-7 text-xs"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                finishRename(false);
              }
            }}
          />
          <Button
            type="submit"
            size="icon-xs"
            variant="ghost"
            aria-label="Save name"
          >
            <Check aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Cancel rename"
            onClick={() => finishRename(false)}
          >
            <X aria-hidden />
          </Button>
        </form>
      ) : (
        <>
          <Button
            type="button"
            size="xs"
            variant={active ? "secondary" : "ghost"}
            aria-pressed={active}
            aria-label={`Apply style ${item.name}`}
            className="min-w-0 flex-1 justify-start truncate"
            onClick={() =>
              setScene((scene) => applyStyleSnapshot(scene, item.snapshot))
            }
          >
            <span className="truncate">{item.name}</span>
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`Rename ${item.name}`}
            title="Rename"
            onClick={() => {
              setDraft(item.name);
              setEditing(true);
            }}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`Delete ${item.name}`}
            title="Delete"
            onClick={() => deleteStyle(item.id)}
          >
            <Trash2 aria-hidden />
          </Button>
        </>
      )}
    </li>
  );
}

export function BrandPanel() {
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const kit = useBrandStore((state) => state.kit);
  const loaded = useBrandStore((state) => state.userKey !== null);
  const error = useBrandStore((state) => state.error);
  const clearError = useBrandStore((state) => state.clearError);
  const saveStyle = useBrandStore((state) => state.saveStyle);
  const addColor = useBrandStore((state) => state.addColor);
  const removeColor = useBrandStore((state) => state.removeColor);
  const updateWatermark = useBrandStore((state) => state.updateWatermark);

  const [styleName, setStyleName] = useState("");
  const [pickColor, setPickColor] = useState("#7c5cff");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const watermark = kit.watermark;
  const stylesFull = kit.styles.length >= MAX_SAVED_STYLES;
  const colorsFull = kit.colors.length >= MAX_BRAND_COLORS;
  const backgroundColor =
    scene.background.kind === "solid"
      ? scene.background.color
      : scene.background.kind === "gradient"
        ? scene.background.stops[0]?.color
        : undefined;

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    setLogoBusy(true);
    try {
      const logo = await prepareLogo(file);
      updateWatermark({ logo, enabled: true });
    } catch (reason) {
      setLogoError(
        reason instanceof Error
          ? reason.message
          : "The logo could not be used.",
      );
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!loaded) {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        Loading brand kit...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px]"
        >
          <span>{error}</span>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Dismiss"
            onClick={clearError}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : null}

      <Section
        title="Saved styles"
        hint={`${kit.styles.length} / ${MAX_SAVED_STYLES}`}
      >
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (saveStyle(styleName || nextStyleName(kit.styles), scene))
              setStyleName("");
          }}
        >
          <Input
            value={styleName}
            maxLength={MAX_STYLE_NAME}
            placeholder={nextStyleName(kit.styles)}
            aria-label="New style name"
            className="h-8 text-xs"
            disabled={stylesFull}
            onChange={(event) => setStyleName(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={stylesFull}>
            <Plus aria-hidden />
            Save
          </Button>
        </form>
        <p className="text-muted-foreground text-[10px]">
          {stylesFull
            ? "Style limit reached. Delete one to save another."
            : "Saves background, frame, style, position, layout and light. Your screenshot and text stay as they are."}
        </p>
        {kit.styles.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Saved styles">
            {kit.styles.map((item) => (
              <StyleRow
                key={item.id}
                item={item}
                active={styleMatches(scene, item.snapshot)}
              />
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        title="Brand colors"
        hint={`${kit.colors.length} / ${MAX_BRAND_COLORS}`}
      >
        {kit.colors.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Brand colors">
            {kit.colors.map((color) => (
              <li
                key={color}
                className="flex items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-1"
              >
                <span
                  aria-hidden
                  className="size-5 rounded"
                  style={{ background: color }}
                />
                <span className="font-mono text-[10px]">{color}</span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove brand color ${color}`}
                  onClick={() => removeColor(color)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-[10px]">
            Brand colors show up first in the background, text and annotation
            pickers.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={pickColor}
            aria-label="Pick a brand color"
            className="h-8 w-10 cursor-pointer rounded-md border bg-transparent p-0.5"
            disabled={colorsFull}
            onChange={(event) => setPickColor(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={colorsFull}
            onClick={() => addColor(pickColor)}
          >
            <Plus aria-hidden />
            Add
          </Button>
          {backgroundColor && normalizeHexColor(backgroundColor) ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={
                colorsFull ||
                kit.colors.includes(normalizeHexColor(backgroundColor) ?? "")
              }
              onClick={() => addColor(backgroundColor)}
            >
              Add from background
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title="Watermark">
        <div className="grid grid-cols-2 gap-1">
          <Button
            type="button"
            size="xs"
            variant={scene.watermark ? "secondary" : "outline"}
            aria-pressed={scene.watermark}
            onClick={() =>
              setScene((current) => ({
                ...current,
                watermark: !current.watermark,
              }))
            }
          >
            {scene.watermark ? "Watermark on" : "Watermark off"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={watermark.enabled ? "secondary" : "outline"}
            aria-pressed={watermark.enabled}
            onClick={() => updateWatermark({ enabled: !watermark.enabled })}
          >
            {watermark.enabled ? "My watermark" : "Shotlark badge"}
          </Button>
        </div>

        {watermark.enabled ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Text</span>
              <Input
                value={watermark.text}
                maxLength={MAX_WATERMARK_TEXT}
                placeholder="@yourhandle"
                aria-label="Watermark text"
                className="h-8 text-xs"
                onChange={(event) =>
                  updateWatermark({ text: event.target.value })
                }
              />
            </label>

            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Logo</span>
              <div className="flex items-center gap-2">
                {watermark.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
                  <img
                    src={watermark.logo.dataUrl}
                    alt="Your logo"
                    className="bg-muted h-8 max-w-24 rounded border object-contain p-0.5"
                  />
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(event) => void onLogoFile(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={logoBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus aria-hidden />
                  {logoBusy
                    ? "Loading..."
                    : watermark.logo
                      ? "Replace"
                      : "Upload logo"}
                </Button>
                {watermark.logo ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove logo"
                    onClick={() => updateWatermark({ logo: null })}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
              <p
                className={
                  logoError
                    ? "text-destructive text-[10px]"
                    : "text-muted-foreground text-[10px]"
                }
                role={logoError ? "alert" : undefined}
              >
                {logoError ?? "PNG or SVG, up to 500 KB."}
              </p>
            </div>

            {!hasCustomWatermark(watermark) ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Add text or a logo. Until then the Shotlark badge is used.
              </p>
            ) : null}

            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Corner</span>
              <div
                role="radiogroup"
                aria-label="Watermark corner"
                className="grid w-24 grid-cols-2 gap-1"
              >
                {CORNERS.map((corner) => {
                  const active = watermark.corner === corner.id;
                  return (
                    <button
                      key={corner.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={corner.label}
                      title={corner.label}
                      className={`focus-visible:ring-ring flex h-7 rounded-md border p-1 outline-none focus-visible:ring-2 ${
                        active ? "border-ring bg-secondary" : "hover:bg-muted"
                      } ${corner.id.startsWith("top") ? "items-start" : "items-end"} ${
                        corner.id.endsWith("left")
                          ? "justify-start"
                          : "justify-end"
                      }`}
                      onClick={() => updateWatermark({ corner: corner.id })}
                    >
                      <span
                        aria-hidden
                        className={`h-1.5 w-3 rounded-sm ${active ? "bg-primary" : "bg-muted-foreground/50"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Size</span>
                <span>{watermark.size}%</span>
              </div>
              <Slider
                value={[watermark.size]}
                min={50}
                max={200}
                step={5}
                aria-label="Watermark size"
                onValueChange={([value]) => updateWatermark({ size: value })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Opacity</span>
                <span>{watermark.opacity}%</span>
              </div>
              <Slider
                value={[watermark.opacity]}
                min={10}
                max={100}
                step={5}
                aria-label="Watermark opacity"
                onValueChange={([value]) => updateWatermark({ opacity: value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                size="xs"
                variant={watermark.pill ? "secondary" : "outline"}
                aria-pressed={watermark.pill}
                onClick={() => updateWatermark({ pill: !watermark.pill })}
              >
                Background pill
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                aria-label={`Tone: ${watermark.tone}. Switch tone`}
                onClick={() =>
                  updateWatermark({
                    tone: watermark.tone === "dark" ? "light" : "dark",
                  })
                }
              >
                {watermark.tone === "dark" ? "Dark tone" : "Light tone"}
              </Button>
            </div>
          </div>
        ) : null}

        <p className="text-muted-foreground text-[10px]">
          {scene.watermark
            ? "Shown in the preview and every download."
            : "Watermark is off for this design."}{" "}
          Brand kit is saved in this browser.
        </p>
      </Section>
    </div>
  );
}
