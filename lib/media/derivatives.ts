import "server-only";
import sharp from "sharp";
import { isHeic } from "./file-classify";

export interface Derivatives {
  width: number;
  height: number;
  thumb: Buffer; // ~400px webp
  medium: Buffer; // ~1200px webp
  preview: Buffer | null; // full-res jpeg, only for HEIC/HEIF originals
}

export async function generateDerivatives(
  buffer: Buffer,
  originalFilename: string
): Promise<Derivatives> {
  // rotate() with no args auto-orients based on EXIF, then strips the tag so
  // every derivative and consumer downstream can assume "already upright".
  // Metadata is read back from the rotated buffer, not the input, since
  // width/height must reflect the upright image (sharp's metadata() on a
  // pending pipeline reports the pre-rotation sensor dimensions).
  const orientedBuffer = await sharp(buffer).rotate().toBuffer();
  const metadata = await sharp(orientedBuffer).metadata();

  const thumb = await sharp(orientedBuffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const medium = await sharp(orientedBuffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const preview = isHeic(originalFilename)
    ? await sharp(orientedBuffer).jpeg({ quality: 90 }).toBuffer()
    : null;

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    thumb,
    medium,
    preview,
  };
}
