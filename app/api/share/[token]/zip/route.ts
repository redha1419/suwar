import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import {
  getActiveShareLink,
  resolveShareTarget,
  resolveAlbumForAllScope,
} from "@/lib/share/resolve";
import { storage } from "@/lib/storage";
import type { photos } from "@/lib/db/schema";

export const maxDuration = 60;

type PhotoRow = typeof photos.$inferSelect;

function uniqueFilename(used: Set<string>, filename: string): string {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  const ext = dot === -1 ? "" : filename.slice(dot);
  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const albumId = req.nextUrl.searchParams.get("albumId");

  const link = await getActiveShareLink(token);
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let targetPhotos: PhotoRow[];
  let zipName: string;

  if (link.scope === "album") {
    const target = await resolveShareTarget(link);
    if (!target || target.scope !== "album") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    targetPhotos = target.photos;
    zipName = target.album.title;
  } else if (link.scope === "all") {
    if (!albumId) {
      return NextResponse.json({ error: "Missing albumId" }, { status: 400 });
    }
    const result = await resolveAlbumForAllScope(link, albumId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    targetPhotos = result.photos;
    zipName = result.album.title;
  } else {
    return NextResponse.json({ error: "Not applicable for this link" }, { status: 400 });
  }

  if (targetPhotos.length === 0) {
    return NextResponse.json({ error: "Nothing to download" }, { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const used = new Set<string>();

  (async () => {
    for (const photo of targetPhotos) {
      try {
        const buffer = await storage.getObjectBuffer(photo.originalKey);
        archive.append(buffer, { name: uniqueFilename(used, photo.originalFilename) });
      } catch {
        // skip a single unreadable file rather than failing the whole zip
      }
    }
    archive.finalize();
  })();

  const safeName = zipName.replace(/[^\w\- ]/g, "").trim() || "photos";

  return new NextResponse(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
