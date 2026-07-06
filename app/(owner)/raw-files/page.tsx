import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { rawFiles } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { RawFileRow } from "@/components/raw-files/raw-file-row";

export default async function RawFilesPage() {
  const session = await requireOwner();

  const unmatched = await db.query.rawFiles.findMany({
    where: and(eq(rawFiles.ownerId, session.ownerId!), isNull(rawFiles.photoId)),
    orderBy: desc(rawFiles.uploadedAt),
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-2 text-xs text-muted-2">
        RAW files with no matching JPEG — download or delete only, they never
        appear in albums.
      </p>
      {unmatched.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-2">
          No unmatched RAW files.
        </p>
      ) : (
        unmatched.map((rf) => (
          <RawFileRow
            key={rf.id}
            id={rf.id}
            filename={rf.originalFilename}
            extension={rf.extension}
            bytes={rf.bytes}
          />
        ))
      )}
    </div>
  );
}
