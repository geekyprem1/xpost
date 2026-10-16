export const EXPORT_FORMATS = ["png", "jpg", "webp"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ExportFileKind = ExportFormat | "mp4" | "gif";

export const EXPORT_SCALES = [1, 2, 3] as const;
export type ExportScale = (typeof EXPORT_SCALES)[number];

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export function exportMime(format: ExportFormat): string {
  return MIME[format];
}

export function exportFilename(
  format: ExportFileKind,
  date = new Date()
): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
  return `shotlark-${stamp}.${format}`;
}
