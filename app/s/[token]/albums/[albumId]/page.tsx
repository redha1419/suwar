import {
  getActiveShareLink,
  resolveAlbumForAllScope,
  bumpShareAccess,
} from "@/lib/share/resolve";
import { ShareUnavailable } from "@/components/public/share-unavailable";
import { PublicPhotoGrid } from "@/components/public/public-photo-grid";

export default async function SharedAlbumPage({
  params,
}: {
  params: Promise<{ token: string; albumId: string }>;
}) {
  const { token, albumId } = await params;
  const link = await getActiveShareLink(token);
  if (!link) return <ShareUnavailable />;

  const result = await resolveAlbumForAllScope(link, albumId);
  if (!result) return <ShareUnavailable />;

  bumpShareAccess(link.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-light text-foreground">
          {result.album.title}
        </h1>
        <a
          href={`/api/share/${token}/zip?albumId=${albumId}`}
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          Download All
        </a>
      </div>
      <PublicPhotoGrid
        token={token}
        photos={result.photos.map((p) => ({ ...p, hasThumb: Boolean(p.thumbKey) }))}
      />
    </div>
  );
}
