import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDefaultScene } from "@/lib/scene";
import {
  parseLocalDraft,
  readLocalDraft,
  writeLocalDraft,
  type LocalDraft,
} from "./local-draft";

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
});
