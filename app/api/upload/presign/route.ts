import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getOwnerIdForApi } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

const bodySchema = z.array(
  z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().nonnegative(),
  })
).min(1).max(500);

export async function POST(req: NextRequest) {
  const ownerId = await getOwnerIdForApi();
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const results = await Promise.all(
    parsed.data.map(async (file) => {
      const pendingId = randomUUID();
      const key = `staging/${pendingId}/${file.filename}`;
      const uploadUrl = await storage.getPresignedUploadUrl(
        key,
        file.contentType
      );
      return { pendingId, key, filename: file.filename, uploadUrl };
    })
  );

  return NextResponse.json({ files: results });
}
