import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import {
  deleteProjectCache,
  parseProjectCache,
  readProjectCache,
  writeProjectCache,
  type ProjectCacheEntry,
} from "./project-cache";

const UID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function entry(
  projectId: string,
  overrides: Partial<ProjectCacheEntry> = {},
): ProjectCacheEntry {
  const scene = createDefaultScene();
  scene.image = { path: "local/a.png", width: 10, height: 10 };
  return {
    version: 1,
    projectId,
    userId: UID,
    baseUpdatedAt: "2026-10-20T10:00:00+00:00",
    dirty: true,
    title: "Launch",
    scene,
    image: new Blob(["png"], { type: "image/png" }),
    imagePath: `${UID}/${projectId}/source-a.png`,
    postText: "hello",
    ...overrides,
  };
}

describe("project cache (IndexedDB)", () => {
  it("round-trip: scene + image blob + base", async () => {
    await writeProjectCache(entry("p1"));
    const restored = await readProjectCache("p1", UID);
    expect(restored?.title).toBe("Launch");
    expect(restored?.dirty).toBe(true);
    expect(await restored?.image?.text()).toBe("png");
    expect(restored?.scene.image?.path).toBe("local/a.png");
  });

  it("doosre user ka cache nahi milta", async () => {
    await writeProjectCache(entry("p2"));
    expect(
      await readProjectCache("p2", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ).toBeNull();
  });

  it("delete ke baad null", async () => {
    await writeProjectCache(entry("p3"));
    await deleteProjectCache("p3");
    expect(await readProjectCache("p3", UID)).toBeNull();
  });

  it("invalid entries null (load block nahi hota)", () => {
    expect(parseProjectCache(null, "p", UID)).toBeNull();
    expect(
      parseProjectCache({ ...entry("p"), version: 2 }, "p", UID),
    ).toBeNull();
    expect(parseProjectCache(entry("p", { image: null }), "p", UID)).toBeNull();
    expect(
      parseProjectCache({ ...entry("p"), scene: { version: 99 } }, "p", UID),
    ).toBeNull();
  });
});
