import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOwnerIdForApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { storage, usingR2 } from "@/lib/storage";
import { canTokenAccessPhoto } from "@/lib/share/resolve";

const VARIANTS = ["thumb", "medium", "preview", "original"] as const;
type Variant = (typeof VARIANTS)[number];

// All variants (including the original) are shareable — the owner explicitly
// chose full-quality downloads for shared photos over stripping GPS/EXIF.
const SHAREABLE_VARIANTS = new Set<Variant>(["thumb", "medium", "preview", "original"]);

const CONTENT_TYPES: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  heic: "image/heic",
  heif: "image/heif",
  tiff: "image/tiff",
  tif: "image/tiff",
  png: "image/png",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string; variant: string }> }
) {
  const { photoId, variant } = await params;
  if (!VARIANTS.includes(variant as Variant)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  const ownerId = await getOwnerIdForApi();
  const shareToken = req.nextUrl.searchParams.get("t");
  const download = req.nextUrl.searchParams.get("download") === "1";

  let authorized = false;
  if (ownerId) {
    authorized = true;
  } else if (shareToken && SHAREABLE_VARIANTS.has(variant as Variant)) {
    authorized = await canTokenAccessPhoto(shareToken, photoId);
  }
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photo = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
  });
  if (!photo || (ownerId && photo.ownerId !== ownerId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let key: string | null;
  let contentType: string;
  switch (variant as Variant) {
    case "thumb":
      key = photo.thumbKey;
      contentType = "image/webp";
      break;
    case "medium":
      key = photo.mediumKey;
      contentType = "image/webp";
      break;
    case "preview":
      key = photo.previewKey ?? photo.originalKey;
      contentType = photo.previewKey
        ? "image/jpeg"
        : CONTENT_TYPES[photo.originalFormat] ?? "application/octet-stream";
      break;
    case "original":
      key = photo.originalKey;
      contentType = CONTENT_TYPES[photo.originalFormat] ?? "application/octet-stream";
      break;
  }

  if (!key) {
    return NextResponse.json({ error: "Variant not available" }, { status: 404 });
  }

  const contentDisposition = download
    ? `attachment; filename="${photo.originalFilename.replace(/"/g, "")}"`
    : undefined;

  if (usingR2) {
    const url = await storage.getPresignedDownloadUrl(key, 3600, contentDisposition);
    return NextResponse.redirect(url);
  }

  try {
    const buffer = await storage.getObjectBuffer(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=31536000, immutable",
        ...(contentDisposition ? { "content-disposition": contentDisposition } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
