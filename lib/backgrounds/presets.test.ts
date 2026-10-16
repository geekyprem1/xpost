import { describe, expect, it } from "vitest";
import { parseColor } from "@/lib/renderer/color";
import {
  MESH_PRESETS,
  PREMIUM_PRESETS,
  WALLPAPER_PRESETS,
  filterByTags,
  findMeshPreset,
  type BackgroundTag,
} from "./presets";

describe("background presets", () => {
  it("saare ids unique hain", () => {
    const ids = [
      ...MESH_PRESETS.map((p) => p.id),
      ...WALLPAPER_PRESETS.map((p) => p.id),
      ...PREMIUM_PRESETS.map((p) => p.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("saare colors valid hex hain", () => {
    for (const preset of MESH_PRESETS) {
      expect(parseColor(preset.base), preset.id).not.toEqual([0, 0, 0]);
      for (const blob of preset.blobs) {
        expect(parseColor(blob.color), `${preset.id}:${blob.color}`).not.toEqual([0, 0, 0]);
      }
    }
    for (const preset of [...WALLPAPER_PRESETS, ...PREMIUM_PRESETS]) {
      expect(preset.stops.length, preset.id).toBeGreaterThanOrEqual(2);
      for (const stop of preset.stops) {
        expect(parseColor(stop.color), `${preset.id}:${stop.color}`).not.toEqual([0, 0, 0]);
      }
    }
  });

  it("saare tags valid hain", () => {
    const valid = new Set(["liquid", "vibrant", "minimal", "dark"]);
    for (const preset of [...MESH_PRESETS, ...WALLPAPER_PRESETS, ...PREMIUM_PRESETS]) {
      for (const tag of preset.tags) {
        expect(valid.has(tag), `${preset.id}:${tag}`).toBe(true);
      }
    }
  });

  it("filterByTags OR semantics follow karta hai", () => {
    expect(filterByTags(MESH_PRESETS, []).length).toBe(MESH_PRESETS.length);
    const vibes = filterByTags(MESH_PRESETS, ["vibrant"]);
    expect(vibes.length).toBeGreaterThan(0);
    for (const preset of vibes) {
      expect(preset.tags).toContain("vibrant");
    }
    const both = filterByTags(MESH_PRESETS, ["vibrant", "dark"]);
    expect(both.length).toBeGreaterThanOrEqual(vibes.length);
    expect(filterByTags(MESH_PRESETS, ["vibrant"]).every((p) => both.includes(p))).toBe(true);
  });

  it("koi tag match na ho to empty array", () => {
    const custom: { tags: BackgroundTag[] }[] = [{ tags: ["dark"] }];
    expect(filterByTags(custom, ["vibrant"])).toEqual([]);
  });

  it("findMeshPreset id se preset deta hai", () => {
    expect(findMeshPreset("aurora")?.name).toBe("Aurora");
    expect(findMeshPreset("nope")).toBeNull();
  });
});
