import { NextRequest, NextResponse } from "next/server";
import { getOwnerIdForApi } from "@/lib/auth/session";
import { localProvider } from "@/lib/storage/local";

/**
 * Dev-only stand-in for the presigned S3/R2 URLs the real StorageProvider
 * would return. Not used once R2 credentials are configured (see lib/storage/index.ts).
 */

export async function PUT(req: NextRequest) {
  const ownerId = await getOwnerIdForApi();
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const arrayBuffer = await req.arrayBuffer();
  await localProvider.putObject(
    key,
    Buffer.from(arrayBuffer),
    req.headers.get("content-type") ?? "application/octet-stream"
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const ownerId = await getOwnerIdForApi();
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    const buffer = await localProvider.getObjectBuffer(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "content-type": "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
