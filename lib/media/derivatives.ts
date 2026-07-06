import "server-only";
import sharp from "sharp";
import convert from "heic-convert";
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
  const isHeicFile = isHeic(originalFilename);

  // sharp's bundled libheif enforces a strict security limit on the number of
  // auxiliary image references (iref box), which real iPhone photos routinely
  // exceed once they carry Live Photo / portrait-matte / HDR gain-map variants
  // — sharp throws "Security limit exceeded" on those. heic-convert (a WASM
  // libheif build without that limit) decodes them fine, so HEIC/HEIF originals
  // go through it first; everything downstream just deals with plain JPEG bytes.
  // It also applies any HEIF-level rotation during decode, so the output has no
  // EXIF orientation tag to reapply.
  const sourceBuffer = isHeicFile
    ? Buffer.from(await convert({ buffer, format: "JPEG", quality: 0.95 }))
    : buffer;

  // rotate() with no args auto-orients based on EXIF, then strips the tag so
  // every derivative and consumer downstream can assume "already upright".
  // Metadata is read back from the rotated buffer, not the input, since
  // width/height must reflect the upright image (sharp's metadata() on a
  // pending pipeline reports the pre-rotation sensor dimensions).
  const orientedBuffer = await sharp(sourceBuffer).rotate().toBuffer();
  const metadata = await sharp(orientedBuffer).metadata();

  const thumb = await sharp(orientedBuffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const medium = await sharp(orientedBuffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const preview = isHeicFile
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
