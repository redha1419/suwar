import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredTrash } from "@/lib/jobs/purge-trash";

export const maxDuration = 60;

/**
 * Hit by a scheduler (Vercel Cron, or any external cron once deployed) — not
 * by the browser. Protected by a shared secret rather than the owner session
 * since the caller here is a machine, not a logged-in browser.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredTrash();
  return NextResponse.json(result);
}
