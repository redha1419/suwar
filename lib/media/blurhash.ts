import "server-only";
import sharp from "sharp";
import { encode } from "blurhash";

export async function generateBlurhash(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
}
