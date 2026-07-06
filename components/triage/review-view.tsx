"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlbumPicker, type AlbumOption } from "@/components/albums/album-picker";
import { ExifStrip, type ExifStripData } from "@/components/exif-strip/exif-strip";
import {
  assignPhotosToAlbum,
  keepPhotos,
  returnPhotosToInbox,
  trashPhotos,
  type AssignToAlbumResult,
} from "@/lib/photos/actions";

export interface ReviewPhoto extends ExifStripData {
  id: string;
  originalFilename: string;
  hasThumb: boolean;
}

interface HistoryEntry {
  photo: ReviewPhoto;
  index: number;
  type: "trash" | "keep";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA"].includes(target.tagName);
}

export function ReviewView({
  initialPhotos,
  albums,
}: {
  initialPhotos: ReviewPhoto[];
  albums: AlbumOption[];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialPhotos);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [assignedByPhoto, setAssignedByPhoto] = useState<Record<string, Set<string>>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [pending, setPending] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  const current = queue[index] ?? null;
  const quickAlbums = useMemo(() => albums.slice(0, 9), [albums]);

  const doTrash = useCallback(async () => {
    if (!current || pending) return;
    setPending(true);
    const photo = current;
    const at = index;
    try {
      await trashPhotos([photo.id]);
      setHistory((h) => [...h, { photo, index: at, type: "trash" }]);
      setQueue((q) => q.filter((p) => p.id !== photo.id));
      setIndex((i) => Math.min(i, Math.max(0, queue.length - 2)));
    } finally {
      setPending(false);
    }
  }, [current, index, pending, queue.length]);

  const doKeep = useCallback(async () => {
    if (!current || pending) return;
    setPending(true);
    const photo = current;
    const at = index;
    try {
      await keepPhotos([photo.id]);
      setHistory((h) => [...h, { photo, index: at, type: "keep" }]);
      setQueue((q) => q.filter((p) => p.id !== photo.id));
      setIndex((i) => Math.min(i, Math.max(0, queue.length - 2)));
    } finally {
      setPending(false);
    }
  }, [current, index, pending, queue.length]);

  const doAssignAlbum = useCallback(
    async (albumId: string): Promise<AssignToAlbumResult> => {
      if (!current) return { added: 0, blocked: 0 };
      const photoId = current.id;
      const result = await assignPhotosToAlbum([photoId], albumId);
      if (result.added > 0) {
        setAssignedByPhoto((prev) => {
          const next = { ...prev };
          next[photoId] = new Set(prev[photoId] ?? []);
          next[photoId].add(albumId);
          return next;
        });
      }
      if (result.blocked > 0) {
        setBlockedNotice("Already in another album — remove it from that album first.");
        setTimeout(() => setBlockedNotice(null), 3000);
      }
      return result;
    },
    [current]
  );

  const doUndo = useCallback(async () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      returnPhotosToInbox([last.photo.id]).then(() => router.refresh());
      setQueue((q) => {
        const next = [...q];
        next.splice(last.index, 0, last.photo);
        return next;
      });
      setIndex(last.index);
      return h.slice(0, -1);
    });
  }, [router]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || showPicker) return;

      if (e.key === "ArrowRight" || e.key === "k") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, queue.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "j") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "x" || e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        doTrash();
      } else if (e.key === "Enter" || e.key === "a") {
        e.preventDefault();
        doKeep();
      } else if (e.key === "z") {
        e.preventDefault();
        doUndo();
      } else if (e.key === " ") {
        e.preventDefault();
        setShowPicker(true);
      } else if (/^[1-9]$/.test(e.key)) {
        const album = quickAlbums[Number(e.key) - 1];
        if (album) doAssignAlbum(album.id);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [doTrash, doKeep, doUndo, doAssignAlbum, quickAlbums, queue.length, showPicker]);

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-sm text-muted">Inbox is empty.</p>
        {history.length > 0 && (
          <button
            onClick={doUndo}
            className="text-xs text-muted-2 underline hover:text-foreground"
          >
            Undo last action
          </button>
        )}
      </div>
    );
  }

  const assignedIds = assignedByPhoto[current!.id] ?? new Set<string>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span>
          → next · ← back · Enter keep · X trash · Space album · 1-9 quick-add · Z undo
        </span>
      </div>

      <div className="flex justify-center bg-black">
        {current!.hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${current!.id}/preview`}
            alt={current!.originalFilename}
            className="max-h-[70vh] max-w-full object-contain"
          />
        ) : (
          <div className="flex h-[50vh] w-full items-center justify-center text-sm text-muted-2">
            Processing…
          </div>
        )}
      </div>

      <ExifStrip data={current!} />

      {blockedNotice && (
        <p className="text-xs text-muted">{blockedNotice}</p>
      )}

      {quickAlbums.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickAlbums.map((album, i) => (
            <button
              key={album.id}
              disabled={pending}
              onClick={() => doAssignAlbum(album.id)}
              className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
                assignedIds.has(album.id)
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-foreground/80 hover:bg-surface"
              }`}
            >
              {i + 1}. {album.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={doKeep}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          Keep
        </button>
        <button
          disabled={pending}
          onClick={doTrash}
          className="rounded-md border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
        >
          Trash
        </button>
        <button
          onClick={() => setShowPicker(true)}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
        >
          Add to Album…
        </button>
        {history.length > 0 && (
          <button
            onClick={doUndo}
            className="ml-auto rounded-md px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Undo {history[history.length - 1].type}
          </button>
        )}
      </div>

      {showPicker && (
        <AlbumPicker
          albums={albums}
          onPick={doAssignAlbum}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
