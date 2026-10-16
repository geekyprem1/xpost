import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  buildCacheKey,
  chooseVideoFile,
  normalizePhoto,
  normalizeVideo,
  type PexelsPhoto,
  type PexelsVideo,
} from "./normalize.ts";

export const PHOTO: PexelsPhoto = {
  id: 101,
  width: 4000,
  height: 3000,
  photographer: "Test Photographer",
  photographer_url: "https://www.pexels.com/@test",
  src: {
    original: "https://images.pexels.com/original.jpg",
    large2x: "https://images.pexels.com/large2x.jpg",
    large: "https://images.pexels.com/large.jpg",
    medium: "https://images.pexels.com/medium.jpg",
    small: "https://images.pexels.com/small.jpg",
    tiny: "https://images.pexels.com/tiny.jpg",
  },
};

export const VIDEO: PexelsVideo = {
  id: 202,
  width: 3840,
  height: 2160,
  duration: 12,
  image: "https://images.pexels.com/video-preview.jpg",
  user: { name: "Test Creator", url: "https://www.pexels.com/@creator" },
  video_files: [
    { id: 1, quality: "sd", file_type: "video/mp4", width: 640, height: 360, link: "https://videos.pexels.com/sd.mp4" },
    { id: 2, quality: "hd", file_type: "video/mp4", width: 1280, height: 720, link: "https://videos.pexels.com/hd-720.mp4" },
    { id: 3, quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: "https://videos.pexels.com/hd-1080.mp4" },
    { id: 4, quality: "uhd", file_type: "video/mp4", width: 3840, height: 2160, link: "https://videos.pexels.com/uhd.mp4" },
  ],
};

Deno.test("normalizePhoto: fields map hote hain", () => {
  const item = normalizePhoto(PHOTO);
  assertEquals(item.id, "101");
  assertEquals(item.provider, "pexels");
  assertEquals(item.type, "photo");
  assertEquals(item.url, "https://images.pexels.com/large2x.jpg");
  assertEquals(item.previewUrl, "https://images.pexels.com/medium.jpg");
  assertEquals(item.credit.name, "Test Photographer");
});

Deno.test("normalizePhoto: large2x missing ho to large fallback", () => {
  const sparse = { ...PHOTO, src: { ...PHOTO.src, large2x: "" } };
  assertEquals(normalizePhoto(sparse).url, "https://images.pexels.com/large.jpg");
});

Deno.test("chooseVideoFile: hd ≤1920 mein se sabse bada", () => {
  const file = chooseVideoFile(VIDEO.video_files);
  assert(file);
  assertEquals(file.link, "https://videos.pexels.com/hd-1080.mp4");
});

Deno.test("chooseVideoFile: hd na ho to largest mp4, mp4 na ho to null", () => {
  const sdOnly = VIDEO.video_files.filter((file) => file.quality !== "hd");
  assertEquals(chooseVideoFile(sdOnly)?.link, "https://videos.pexels.com/uhd.mp4");
  assertEquals(chooseVideoFile([]), null);
});

Deno.test("normalizeVideo: item + credit", () => {
  const item = normalizeVideo(VIDEO);
  assert(item);
  assertEquals(item.id, "202");
  assertEquals(item.type, "video");
  assertEquals(item.width, 1920);
  assertEquals(item.url, "https://videos.pexels.com/hd-1080.mp4");
  assertEquals(item.previewUrl, "https://images.pexels.com/video-preview.jpg");
  assertEquals(item.credit.name, "Test Creator");
});

Deno.test("normalizeVideo: mp4 file na ho to null", () => {
  const noMp4 = { ...VIDEO, video_files: [] };
  assertEquals(normalizeVideo(noMp4), null);
});

Deno.test("buildCacheKey: trim + lowercase", () => {
  const key = buildCacheKey({
    type: "video",
    query: "  Golden Hour ",
    page: 2,
    perPage: 24,
    orientation: "landscape",
  });
  assertEquals(key, "v1:video:landscape:golden hour:2:24");
});
