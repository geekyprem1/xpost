export type PixabayItem = {
  id: string;
  provider: "pixabay";
  type: "photo" | "video";
  width: number;
  height: number;
  url: string;
  previewUrl: string;
  credit: { name: string; url: string };
};

export type PixabayPhoto = {
  id: number;
  pageURL: string;
  previewURL: string;
  previewWidth?: number;
  previewHeight?: number;
  webformatURL: string;
  webformatWidth?: number;
  webformatHeight?: number;
  largeImageURL: string;
  user: string;
  user_id: number;
};

export type PixabayVideoRendition = {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
};

export type PixabayVideo = {
  id: number;
  pageURL: string;
  duration: number;
  user: string;
  user_id: number;
  videos: {
    large?: PixabayVideoRendition;
    medium?: PixabayVideoRendition;
    small?: PixabayVideoRendition;
    tiny?: PixabayVideoRendition;
  };
};

export type PixabaySearchPayload = {
  total?: number;
  totalHits?: number;
  hits?: unknown[];
};

export function pixabayCredit(
  user: string,
  userId: number
): { name: string; url: string } {
  return {
    name: user || "Pixabay",
    url: `https://pixabay.com/users/${encodeURIComponent(user || "pixabay")}-${userId}/`,
  };
}

export function normalizePixabayPhoto(photo: PixabayPhoto): PixabayItem {
  return {
    id: String(photo.id),
    provider: "pixabay",
    type: "photo",
    width: photo.webformatWidth ?? photo.previewWidth ?? 0,
    height: photo.webformatHeight ?? photo.previewHeight ?? 0,
    url: photo.largeImageURL || photo.webformatURL,
    previewUrl: photo.webformatURL || photo.previewURL,
    credit: pixabayCredit(photo.user, photo.user_id),
  };
}

export function choosePixabayVideo(
  video: PixabayVideo
): PixabayVideoRendition | null {
  const renditions = video.videos ?? {};
  return (
    renditions.medium ??
    renditions.small ??
    renditions.large ??
    renditions.tiny ??
    null
  );
}

export function normalizePixabayVideo(video: PixabayVideo): PixabayItem | null {
  const rendition = choosePixabayVideo(video);
  if (!rendition || !rendition.url) return null;
  return {
    id: String(video.id),
    provider: "pixabay",
    type: "video",
    width: rendition.width,
    height: rendition.height,
    url: rendition.url,
    previewUrl:
      rendition.thumbnail || video.videos?.small?.thumbnail || "",
    credit: pixabayCredit(video.user, video.user_id),
  };
}

export function buildPixabayCacheKey(input: {
  type: string;
  query: string;
  page: number;
  perPage: number;
  orientation: string;
}): string {
  return [
    "pixabay",
    "v1",
    input.type,
    input.orientation,
    input.query.trim().toLowerCase(),
    input.page,
    input.perPage,
  ].join(":");
}
