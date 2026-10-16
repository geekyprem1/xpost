import { assertEquals } from "jsr:@std/assert@1";
import {
  buildPixabayCacheKey,
  choosePixabayVideo,
  normalizePixabayPhoto,
  normalizePixabayVideo,
  type PixabayPhoto,
  type PixabayVideo,
} from "./normalize.ts";

export const PHOTO: PixabayPhoto = {
  id: 195893,
  pageURL: "https://pixabay.com/photos/flower-195893/",
  previewURL: "https://cdn.pixabay.com/photo/flower_150.jpg",
  previewWidth: 150,
  previewHeight: 84,
  webformatURL: "https://cdn.pixabay.com/photo/flower_640.jpg",
  webformatWidth: 640,
  webformatHeight: 360,
  largeImageURL: "https://cdn.pixabay.com/photo/flower_1280.jpg",
  user: "Josch13",
  user_id: 48777,
};

export const VIDEO: PixabayVideo = {
  id: 125,
  pageURL: "https://pixabay.com/videos/id-125/",
  duration: 12,
  user: "Coverr-Free-Footage",
  user_id: 1281706,
  videos: {
    medium: {
      url: "https://cdn.pixabay.com/video/125_medium.mp4",
      width: 1920,
      height: 1080,
      size: 3562083,
      thumbnail: "https://cdn.pixabay.com/video/125_medium.jpg",
    },
    small: {
      url: "https://cdn.pixabay.com/video/125_small.mp4",
      width: 1280,
      height: 720,
      size: 1030736,
      thumbnail: "https://cdn.pixabay.com/video/125_small.jpg",
    },
  },
};

Deno.test("normalizePixabayPhoto: fields + credit URL", () => {
  const item = normalizePixabayPhoto(PHOTO);
  assertEquals(item.id, "195893");
  assertEquals(item.provider, "pixabay");
  assertEquals(item.type, "photo");
  assertEquals(item.url, "https://cdn.pixabay.com/photo/flower_1280.jpg");
  assertEquals(item.previewUrl, "https://cdn.pixabay.com/photo/flower_640.jpg");
  assertEquals(item.width, 640);
  assertEquals(item.credit.name, "Josch13");
  assertEquals(item.credit.url, "https://pixabay.com/users/Josch13-48777/");
});

Deno.test("normalizePixabayPhoto: largeImageURL khaali ho to webformat fallback", () => {
  const sparse = { ...PHOTO, largeImageURL: "" };
  assertEquals(normalizePixabayPhoto(sparse).url, PHOTO.webformatURL);
});

Deno.test("normalizePixabayVideo: medium choose hota hai, fallback chain", () => {
  const item = normalizePixabayVideo(VIDEO);
  assertEquals(item?.url, "https://cdn.pixabay.com/video/125_medium.mp4");
  assertEquals(item?.width, 1920);
  assertEquals(item?.previewUrl, "https://cdn.pixabay.com/video/125_medium.jpg");

  const smallOnly = { ...VIDEO, videos: { small: VIDEO.videos.small } };
  assertEquals(choosePixabayVideo(smallOnly)?.width, 1280);

  const none = { ...VIDEO, videos: {} };
  assertEquals(normalizePixabayVideo(none), null);
});

Deno.test("buildPixabayCacheKey: prefix + normalize", () => {
  const key = buildPixabayCacheKey({
    type: "video",
    query: "  Ocean Waves ",
    page: 2,
    perPage: 24,
    orientation: "landscape",
  });
  assertEquals(key, "pixabay:v1:video:landscape:ocean waves:2:24");
});
