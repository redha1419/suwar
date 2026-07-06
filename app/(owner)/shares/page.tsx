import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { shareLinks } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { ShareButton } from "@/components/shares/share-button";
import { ShareLinksTable } from "@/components/shares/share-links-table";

export default async function SharesPage() {
  const session = await requireOwner();
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const links = await db.query.shareLinks.findMany({
    where: eq(shareLinks.ownerId, session.ownerId!),
    orderBy: desc(shareLinks.createdAt),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-2">
          Anyone with a link can view — no account needed. Revoke a link to
          cut off access immediately.
        </p>
        <ShareButton
          scope="all"
          targetId={null}
          label="Entire Library"
          buttonLabel="Share Entire Library"
        />
      </div>
      <ShareLinksTable
        links={links.map((l) => ({
          id: l.id,
          url: `${baseUrl}/s/${l.token}`,
          scope: l.scope,
          label: l.label,
          createdAt: l.createdAt.toISOString(),
          revokedAt: l.revokedAt?.toISOString() ?? null,
          viewCount: l.viewCount,
          lastAccessedAt: l.lastAccessedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
