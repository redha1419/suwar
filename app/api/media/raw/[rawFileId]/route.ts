import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOwnerIdForApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { rawFiles } from "@/lib/db/schema";
import { storage, usingR2 } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ rawFileId: string }> }
) {
  const ownerId = await getOwnerIdForApi();
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rawFileId } = await params;
  const rawFile = await db.query.rawFiles.findFirst({
    where: eq(rawFiles.id, rawFileId),
  });
  if (!rawFile || rawFile.ownerId !== ownerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (usingR2) {
    const url = await storage.getPresignedDownloadUrl(rawFile.storageKey);
    return NextResponse.redirect(url);
  }

  try {
    const buffer = await storage.getObjectBuffer(rawFile.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${rawFile.originalFilename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
