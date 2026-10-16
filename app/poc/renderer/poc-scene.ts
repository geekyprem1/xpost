export const POC_SCENE = {
  baseW: 1200,
  baseH: 900,
  imageUrl: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg",
  videoUrl:
    "https://videos.pexels.com/video-files/2278095/2278095-hd_1920_1080_30fps.mp4",
  gradient: {
    from: [255, 122, 195] as [number, number, number],
    to: [106, 92, 255] as [number, number, number],
    angle: 35,
  },
  card: {
    w: 760,
    h: 570,
    radius: 28,
    shadowSpread: 70,
    shadowAlpha: 0.42,
    shadowOffsetY: 26,
  },
  tilt: {
    x: 14,
    y: -16,
    cameraDist: 1600,
  },
  glassTint: 0.18,
};

export const MP4_TEST = {
  width: 1280,
  height: 960,
  fps: 30,
  durationSec: 5,
};

export const GIF_TEST = {
  width: 960,
  height: 720,
  fps: 15,
  durationSec: 5,
};
