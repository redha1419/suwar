import Link from "next/link";
import {
  getActiveShareLink,
  resolveShareTarget,
  bumpShareAccess,
} from "@/lib/share/resolve";
import { ShareUnavailable } from "@/components/public/share-unavailable";
import { PublicPhotoGrid } from "@/components/public/public-photo-grid";
import { ExifStrip } from "@/components/exif-strip/exif-strip";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await getActiveShareLink(token);
  if (!link) return <ShareUnavailable />;

  const target = await resolveShareTarget(link);
  if (!target) return <ShareUnavailable />;

  bumpShareAccess(link.id);

  if (target.scope === "photo") {
    const { photo } = target;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-center bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${photo.id}/preview?t=${token}`}
            alt={photo.originalFilename}
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>
        <div className="flex items-center gap-4">
          <ExifStrip data={photo} />
          <a
            href={`/api/media/${photo.id}/original?download=1&t=${token}`}
            className="shrink-0 text-xs uppercase tracking-wider text-muted hover:text-foreground"
          >
            Download
          </a>
        </div>
      </div>
    );
  }

  if (target.scope === "album") {
    const { album, photos } = target;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-light text-foreground">{album.title}</h1>
          <a
            href={`/api/share/${token}/zip`}
            className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
          >
            Download All
          </a>
        </div>
        <PublicPhotoGrid
          token={token}
          photos={photos.map((p) => ({
            ...p,
            hasThumb: Boolean(p.thumbKey),
          }))}
        />
      </div>
    );
  }

  // scope === "all"
  return (
    <div className="flex flex-col gap-6">
      {target.albums.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-2">
          No albums yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {target.albums.map(({ album, cover, count }) => (
            <Link
              key={album.id}
              href={`/s/${token}/albums/${album.id}`}
              className="group flex flex-col gap-2"
            >
              <div className="aspect-square overflow-hidden bg-surface">
                {cover?.thumbKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${cover.id}/thumb?t=${token}`}
                    alt={album.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-foreground">{album.title}</p>
                <p className="text-xs text-muted-2">
                  {count} photo{count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
