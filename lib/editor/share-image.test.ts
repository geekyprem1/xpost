import { describe, expect, it, vi } from "vitest";
import { createShareImageCache, encodeShareImages } from "./share-image";
import { X_IMAGE_MAX_BYTES } from "@/lib/renderer/x-presets";

describe("share images", () => {
  it("steps JPEG quality down and PNG through 2x, 1.5x, 1x", async () => {
    const encode = vi.fn(
      async () => new Blob([new Uint8Array(X_IMAGE_MAX_BYTES + 1)]),
    );
    encode
      .mockResolvedValueOnce(new Blob([new Uint8Array(X_IMAGE_MAX_BYTES + 1)]))
      .mockResolvedValueOnce(new Blob(["jpeg"]))
      .mockResolvedValueOnce(new Blob([new Uint8Array(X_IMAGE_MAX_BYTES + 1)]))
      .mockResolvedValueOnce(new Blob(["png"]));
    const result = await encodeShareImages(encode);
    expect(encode.mock.calls).toEqual([
      [{ format: "jpg", scale: 2, quality: 0.9 }],
      [{ format: "jpg", scale: 2, quality: 0.8 }],
      [{ format: "png", scale: 2 }],
      [{ format: "png", scale: 1.5 }],
    ]);
    expect(await result.jpeg.text()).toBe("jpeg");
    expect(await result.png!.text()).toBe("png");
  });

  it("keeps JPEG download available when clipboard PNG cannot fit", async () => {
    const result = await encodeShareImages(async (options) =>
      options.format === "jpg"
        ? new Blob(["jpeg"])
        : new Blob([new Uint8Array(X_IMAGE_MAX_BYTES + 1)]),
    );
    expect(result.png).toBeNull();
    expect(result.jpeg.size).toBe(4);
  });

  it("uses the 1x clipboard fallback and rejects oversized JPEGs", async () => {
    const large = new Blob([new Uint8Array(X_IMAGE_MAX_BYTES + 1)]);
    const result = await encodeShareImages(async (options) =>
      options.format === "jpg" || options.scale === 1
        ? new Blob(["fits"])
        : large,
    );
    expect(await result.png!.text()).toBe("fits");
    await expect(encodeShareImages(async () => large)).rejects.toThrow(
      "exceeds 5 MB",
    );
  });

  it("deduplicates work, invalidates changed input, and retries failures", async () => {
    const images = { jpeg: new Blob(), png: new Blob() };
    const render = vi.fn<(input: object) => Promise<typeof images>>(
      async () => images,
    );
    const cache = createShareImageCache(render);
    const input = {};
    const first = cache.get(input);
    expect(cache.get(input)).toBe(first);
    await first;
    await cache.get({});
    expect(render).toHaveBeenCalledTimes(2);
    cache.clear();
    render.mockRejectedValueOnce(new Error("failed"));
    await expect(cache.get(input)).rejects.toThrow("failed");
    await expect(cache.get(input)).resolves.toBe(images);
  });
});
