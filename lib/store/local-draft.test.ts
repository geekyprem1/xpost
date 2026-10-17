import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDefaultScene, type TextLayer } from "@/lib/scene";
import {
  parseLocalDraft,
  readLocalDraft,
  writeLocalDraft,
  type LocalDraft,
} from "./local-draft";

const textLayer = (): TextLayer => ({
  id: "text-1",
  kind: "text",
  visible: true,
  locked: false,
  x: 0.5,
  y: 0.5,
  width: 0.6,
  rotation: 0,
  text: "Screenshot ready",
  style: {
    font: "inter",
    weight: 600,
    size: 64,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.1,
    letterSpacing: 0,
    background: null,
    shadow: null,
  },
});

function draft(): LocalDraft {
  const scene = createDefaultScene();
  scene.image = { path: "local/screenshot.png", width: 900, height: 600 };
  scene.watermark = false;
  return {
    version: 1,
    scene,
    image: new Blob(["original image bytes"], { type: "image/png" }),
    postText: "My previous post",
  };
}

describe("local editor drafts", () => {
  it("restores image bytes, composition and post text from storage", async () => {
    const original = draft();
    await writeLocalDraft("restore-user", original);
    const restored = await readLocalDraft("restore-user");
    expect(restored?.scene).toEqual(original.scene);
    expect(restored?.postText).toBe(original.postText);
    expect(await restored?.image?.text()).toBe("original image bytes");
    expect(restored?.image?.type).toBe("image/png");
  });

  it("keeps each account's draft separate", async () => {
    await writeLocalDraft("account-a", draft());
    expect(await readLocalDraft("account-b")).toBeNull();
  });

  it("saves image removal so a refresh cannot resurrect the old upload", async () => {
    await writeLocalDraft("remove-user", draft());
    await writeLocalDraft("remove-user", {
      version: 1,
      scene: createDefaultScene(),
      image: null,
      postText: "New text",
    });
    const restored = await readLocalDraft("remove-user");
    expect(restored?.scene.image).toBeNull();
    expect(restored?.image).toBeNull();
    expect(restored?.postText).toBe("New text");
  });

  it("preserves ordering when multiple edits save together", async () => {
    const first = draft();
    await Promise.all([
      writeLocalDraft("updates-user", first),
      writeLocalDraft("updates-user", { ...first, postText: "Latest post" }),
    ]);
    expect((await readLocalDraft("updates-user"))?.postText).toBe(
      "Latest post",
    );
  });

  it("rejects missing image bytes instead of restoring a background-only draft", () => {
    expect(() => parseLocalDraft({ ...draft(), image: null })).toThrow(
      "missing its screenshot",
    );
    expect(() => parseLocalDraft({ ...draft(), version: 2 })).toThrow();
  });

  it("persists scene v2 layers with the draft", async () => {
    const original = draft();
    original.scene.layers.push(textLayer());
    await writeLocalDraft("layers-user", original);

    const restored = await readLocalDraft("layers-user");

    expect(restored?.scene.version).toBe(2);
    expect(restored?.scene.layers).toEqual(original.scene.layers);
  });

  it("migrates a v1 scene inside a saved draft", () => {
    const v1Scene = {
      ...createDefaultScene(),
      version: 1,
    } as Record<string, unknown>;
    delete v1Scene.layers;

    const parsed = parseLocalDraft({
      version: 1,
      scene: v1Scene,
      image: null,
      postText: "Old draft",
    });

    expect(parsed.scene.version).toBe(2);
    expect(parsed.scene.layers).toEqual([]);
    expect(parsed.postText).toBe("Old draft");
  });
});
