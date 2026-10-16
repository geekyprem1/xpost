export type PexelsItem = {
  id: string;
  provider: "pexels";
  type: "photo" | "video";
  width: number;
  height: number;
  url: string;
  previewUrl: string;
  credit: { name: string; url: string };
};

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    tiny: string;
  };
};

export type PexelsVideoFile = {
  id: number;
  quality: "hd" | "sd" | "uhd";
  file_type: string;
  width: number | null;
  height: number | null;
  link: string;
};

export type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  user: { name: string; url: string };
  video_files: PexelsVideoFile[];
};

export type PexelsSearchPayload = {
  photos?: PexelsPhoto[];
  videos?: PexelsVideo[];
  next_page?: string | number;
};

export function normalizePhoto(photo: PexelsPhoto): PexelsItem {
  return {
    id: String(photo.id),
    provider: "pexels",
    type: "photo",
    width: photo.width,
    height: photo.height,
    url: photo.src.large2x || photo.src.large || photo.src.original,
    previewUrl: photo.src.medium || photo.src.small || photo.src.tiny,
    credit: { name: photo.photographer, url: photo.photographer_url },
  };
}

export function chooseVideoFile(files: PexelsVideoFile[]): PexelsVideoFile | null {
  const mp4 = files.filter(
    (file) => file.file_type === "video/mp4" && file.width && file.height
  );
  if (mp4.length === 0) return null;
  const hd = mp4.filter(
    (file) => file.quality === "hd" && (file.width ?? 0) <= 1920
  );
  const pool = hd.length > 0 ? hd : mp4;
  return pool.reduce((best, file) =>
    (file.width ?? 0) > (best.width ?? 0) ? file : best
  );
}

export function normalizeVideo(video: PexelsVideo): PexelsItem | null {
  const file = chooseVideoFile(video.video_files ?? []);
  if (!file) return null;
  return {
    id: String(video.id),
    provider: "pexels",
    type: "video",
    width: file.width ?? video.width,
    height: file.height ?? video.height,
    url: file.link,
    previewUrl: video.image,
    credit: {
      name: video.user?.name ?? "Pexels",
      url: video.user?.url ?? "https://www.pexels.com",
    },
  };
}

export function buildCacheKey(input: {
  type: string;
  query: string;
  page: number;
  perPage: number;
  orientation: string;
}): string {
  return [
    "v1",
    input.type,
    input.orientation,
    input.query.trim().toLowerCase(),
    input.page,
    input.perPage,
  ].join(":");
}
