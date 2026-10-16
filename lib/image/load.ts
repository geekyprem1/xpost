export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type FileLike = { type: string; size: number };

export function validateImageFile(file: FileLike): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return "Only PNG, JPG and WebP files are supported.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "The file exceeds 10 MB. Please choose a smaller file.";
  }
  return null;
}

export function firstImageFromList(
  files: ArrayLike<File> | null | undefined,
): File | null {
  if (!files) return null;
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (file && IMAGE_MIME_TYPES.includes(file.type)) return file;
  }
  return null;
}

export function loadImageFromFile(
  file: File,
): Promise<{ element: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => resolve({ element, url });
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load the image. The file may be corrupted."));
    };
    element.src = url;
  });
}
