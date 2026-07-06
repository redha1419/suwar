const RAW_EXTENSIONS = new Set([
  "cr2",
  "cr3",
  "nef",
  "arw",
  "dng",
  "raf",
  "orf",
  "rw2",
  "srw",
  "pef",
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "heic",
  "heif",
  "tiff",
  "tif",
  "png",
]);

export function extensionOf(filename: string): string {
  const match = /\.([^.]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

export function baseFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").toLowerCase();
}

export function isRawFile(filename: string): boolean {
  return RAW_EXTENSIONS.has(extensionOf(filename));
}

export function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(filename));
}

export function isHeic(filename: string): boolean {
  const ext = extensionOf(filename);
  return ext === "heic" || ext === "heif";
}
