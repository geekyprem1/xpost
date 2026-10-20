"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BackgroundThumbnail } from "@/components/editor/panels/background-thumbnail";
import { MotionGallery } from "@/components/editor/panels/motion-gallery";
import { PexelsPane } from "@/components/editor/panels/pexels-pane";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BACKGROUND_TAGS,
  MESH_PRESETS,
  PREMIUM_PRESETS,
  WALLPAPER_PRESETS,
  filterByTags,
  type BackgroundTag,
  type GradientPreset,
  type MeshPreset,
} from "@/lib/backgrounds/presets";
import { gradientBackgroundFromImage } from "@/lib/editor/auto-style";
import { useEditorStore } from "@/lib/store";
import { brandGradient } from "@/lib/brand/brand-kit";
import { useBrandStore } from "@/lib/brand/brand-store";
import { BrandSwatches } from "@/components/editor/panels/brand-swatches";

const TABS = [
  { id: "motion", label: "Motion" },
  { id: "premium", label: "Premium" },
  { id: "search", label: "Search" },
  { id: "photo", label: "Photo" },
  { id: "wallpaper", label: "Wallpaper" },
  { id: "mesh", label: "Mesh" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PEXELS_TABS: TabId[] = ["motion", "search", "photo"];

const TAG_LABELS: Record<BackgroundTag, string> = {
  liquid: "Liquid",
  vibrant: "Vibrant",
  minimal: "Minimal",
  dark: "Dark",
};

const GRID = "grid grid-cols-3 gap-2 pt-3";

const PHOTO_CHIPS = ["workspace", "gradient", "abstract", "texture", "sky"];
const MOTION_CHIPS = [
  "abstract loop",
  "ocean waves",
  "clouds",
  "city night",
  "rain",
];

export function BackgroundPanel() {
  const background = useEditorStore((state) => state.scene.background);
  const imageElement = useEditorStore((state) => state.imageElement);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);
  const [activeTab, setActiveTab] = useState<TabId>("premium");
  const [filters, setFilters] = useState<BackgroundTag[]>([]);
  const brandColors = useBrandStore((state) => state.kit.colors);

  const premium = useMemo(
    () => filterByTags(PREMIUM_PRESETS, filters),
    [filters],
  );
  const wallpaper = useMemo(
    () => filterByTags(WALLPAPER_PRESETS, filters),
    [filters],
  );
  const mesh = useMemo(() => filterByTags(MESH_PRESETS, filters), [filters]);

  const gradient = background.kind === "gradient" ? background : null;
  const solid = background.kind === "solid" ? background : null;
  const activeMeshId = background.kind === "mesh" ? background.presetId : null;

  function applyGradientPreset(preset: GradientPreset) {
    setScene((scene) => ({
      ...scene,
      background: {
        kind: "gradient",
        stops: preset.stops.map((stop) => ({ ...stop })),
        angle: preset.angle,
      },
    }));
  }

  function applyMeshPreset(preset: MeshPreset) {
    setScene((scene) => ({
      ...scene,
      background: { kind: "mesh", presetId: preset.id },
    }));
  }

  function applySolid(color: string) {
    setScene((scene) => ({ ...scene, background: { kind: "solid", color } }));
  }

  function updateGradient(
    updater: (
      current: { stops: { color: string; at: number }[]; angle: number },
      transient: boolean,
    ) => { stops: { color: string; at: number }[]; angle: number },
    transient = false,
  ) {
    setScene(
      (scene) => {
        if (scene.background.kind !== "gradient") return scene;
        return {
          ...scene,
          background: {
            kind: "gradient",
            ...updater(
              { stops: scene.background.stops, angle: scene.background.angle },
              transient,
            ),
          },
        };
      },
      { transient },
    );
  }

  function toggleFilter(tag: BackgroundTag) {
    setFilters((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  function isActiveGradient(preset: GradientPreset): boolean {
    if (!gradient) return false;
    return (
      gradient.angle === preset.angle &&
      JSON.stringify(gradient.stops) === JSON.stringify(preset.stops)
    );
  }

  const isPresetTab = !PEXELS_TABS.includes(activeTab);
  const visiblePresets =
    activeTab === "premium"
      ? premium
      : activeTab === "wallpaper"
        ? wallpaper
        : mesh;

  return (
    <div className="space-y-3">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabId)}
      >
        <TabsList className="grid w-full grid-cols-6">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-0 text-[11px]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {isPresetTab ? (
          <div className="flex flex-wrap gap-1 pt-3">
            {BACKGROUND_TAGS.map((tag) => (
              <Button
                key={tag}
                type="button"
                size="xs"
                variant={filters.includes(tag) ? "secondary" : "outline"}
                aria-pressed={filters.includes(tag)}
                onClick={() => toggleFilter(tag)}
              >
                {TAG_LABELS[tag]}
              </Button>
            ))}
            {visiblePresets.length === 0 ? (
              <p className="text-muted-foreground w-full pt-2 text-xs">
                No results for this filter. Try removing a filter.
              </p>
            ) : null}
          </div>
        ) : null}

        <TabsContent value="premium" className={GRID}>
          {premium.map((preset) => (
            <BackgroundThumbnail
              key={preset.id}
              preset={preset}
              active={isActiveGradient(preset)}
              onSelect={() => applyGradientPreset(preset)}
            />
          ))}
        </TabsContent>
        <TabsContent value="wallpaper" className={GRID}>
          {wallpaper.map((preset) => (
            <BackgroundThumbnail
              key={preset.id}
              preset={preset}
              active={isActiveGradient(preset)}
              onSelect={() => applyGradientPreset(preset)}
            />
          ))}
        </TabsContent>
        <TabsContent value="mesh" className={GRID}>
          {mesh.map((preset) => (
            <BackgroundThumbnail
              key={preset.id}
              preset={preset}
              active={activeMeshId === preset.id}
              onSelect={() => applyMeshPreset(preset)}
            />
          ))}
        </TabsContent>
        <TabsContent value="motion">
          <MotionGallery />
          <details className="mt-4 border-t pt-3">
            <summary className="cursor-pointer text-xs font-medium">
              Search more videos
            </summary>
            <PexelsPane
              defaultKind="video"
              defaultQuery="abstract loop"
              chips={MOTION_CHIPS}
            />
          </details>
        </TabsContent>
        <TabsContent value="search">
          <PexelsPane defaultKind="photo" showKindToggle />
        </TabsContent>
        <TabsContent value="photo">
          <PexelsPane
            defaultKind="photo"
            defaultQuery="workspace"
            chips={PHOTO_CHIPS}
          />
        </TabsContent>
      </Tabs>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Custom</span>
          <Button
            type="button"
            size="xs"
            variant={solid ? "secondary" : "outline"}
            onClick={() => applySolid(solid?.color ?? "#7c5cff")}
          >
            Solid
          </Button>
          <Button
            type="button"
            size="xs"
            variant={gradient ? "secondary" : "outline"}
            onClick={() => {
              if (!gradient) applyGradientPreset(PREMIUM_PRESETS[0]);
            }}
          >
            Gradient
          </Button>
        </div>

        {brandColors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <BrandSwatches
              value={solid?.color}
              label="Brand background colors"
              onPick={applySolid}
            />
            {brandColors.length >= 2 ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  const next = brandGradient(brandColors);
                  if (next)
                    setScene((scene) => ({ ...scene, background: next }));
                }}
              >
                Brand gradient
              </Button>
            ) : null}
          </div>
        ) : null}

        {solid ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={solid.color}
              aria-label="Solid color"
              onChange={(event) => applySolid(event.target.value)}
              className="h-8 w-10 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
            <Input
              value={solid.color}
              aria-label="Hex color"
              className="h-8 font-mono text-xs"
              onChange={(event) => {
                const value = event.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(value)) applySolid(value);
              }}
            />
          </div>
        ) : null}

        {gradient ? (
          <div className="space-y-2">
            {gradient.stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={stop.color}
                  aria-label={`Stop ${index + 1} color`}
                  onChange={(event) => {
                    updateGradient((current) => ({
                      ...current,
                      stops: current.stops.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, color: event.target.value }
                          : item,
                      ),
                    }));
                  }}
                  className="h-7 w-9 cursor-pointer rounded-md border bg-transparent p-0.5"
                />
                <Slider
                  value={[Math.round(stop.at * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`Stop ${index + 1} position`}
                  className="flex-1"
                  onValueChange={([value]) => {
                    updateGradient(
                      (current) => ({
                        ...current,
                        stops: current.stops.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, at: value / 100 }
                            : item,
                        ),
                      }),
                      true,
                    );
                  }}
                  onValueCommit={() => commitScene()}
                />
                {gradient.stops.length > 2 ? (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Stop ${index + 1} remove`}
                    onClick={() => {
                      updateGradient((current) => ({
                        ...current,
                        stops: current.stops.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }));
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="flex items-center gap-2">
              {gradient.stops.length < 4 ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    updateGradient((current) => ({
                      ...current,
                      stops: [
                        ...current.stops,
                        {
                          color: "#ffffff",
                          at: Math.min(
                            1,
                            (current.stops[current.stops.length - 1]?.at ??
                              0.5) + 0.1,
                          ),
                        },
                      ],
                    }));
                  }}
                >
                  <Plus aria-hidden />
                  Stop
                </Button>
              ) : null}
              <Slider
                value={[gradient.angle]}
                min={0}
                max={360}
                step={1}
                aria-label="Gradient angle"
                className="flex-1"
                onValueChange={([value]) => {
                  updateGradient(
                    (current) => ({ ...current, angle: value }),
                    true,
                  );
                }}
                onValueCommit={() => commitScene()}
              />
              <span className="text-muted-foreground w-9 text-right text-[10px]">
                {gradient.angle}°
              </span>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={!imageElement}
          title={imageElement ? undefined : "Upload a screenshot first"}
          onClick={() => {
            if (!imageElement) return;
            setScene((scene) => ({
              ...scene,
              background: gradientBackgroundFromImage(imageElement),
            }));
          }}
        >
          Use screenshot colors
        </Button>
      </div>
    </div>
  );
}
