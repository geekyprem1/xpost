import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./defaults";
import { FULL_CROP, croppedImageSize, getImageCrop, isFullCrop } from "./image";

describe("scene image crop", () => {
  it("image na ho to full crop", () => {
    expect(getImageCrop(createDefaultScene())).toEqual(FULL_CROP);
  });

  it("purane image metadata (crop ke bina) full crop deta hai", () => {
    const scene = createDefaultScene();
    scene.image = { path: "a.png", width: 1200, height: 800 };
    expect(getImageCrop(scene)).toEqual(FULL_CROP);
  });

  it("cropped size normalize rect se nikalta hai", () => {
    const scene = createDefaultScene();
    scene.image = {
      path: "a.png",
      width: 1600,
      height: 1000,
      crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 },
    };
    expect(getImageCrop(scene)).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.5,
      h: 0.6,
    });
    expect(croppedImageSize(scene, { width: 1600, height: 1000 })).toEqual({
      width: 800,
      height: 600,
    });
    expect(croppedImageSize(scene, null)).toBeNull();
  });

  it("isFullCrop sirf exact full rect pe true deta hai", () => {
    expect(isFullCrop(FULL_CROP)).toBe(true);
    expect(isFullCrop({ x: 0, y: 0, w: 0.9, h: 1 })).toBe(false);
  });
});
