"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameAlbum, deleteAlbum } from "@/lib/albums/actions";
import { ShareButton } from "@/components/shares/share-button";

export function AlbumHeaderActions({
  albumId,
  title,
}: {
  albumId: string;
  title: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, setPending] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || value.trim() === title) {
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      await renameAlbum(albumId, value.trim());
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete album "${title}"? Photos themselves are kept.`)) return;
    setPending(true);
    try {
      await deleteAlbum(albumId);
      router.push("/albums");
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleRename}
          className="rounded-md border border-border bg-surface px-2 py-1 text-2xl font-light text-foreground outline-none focus:border-muted"
        />
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <h1
        onClick={() => setEditing(true)}
        className="cursor-text text-2xl font-light text-foreground"
      >
        {title}
      </h1>
      <ShareButton
        scope="album"
        targetId={albumId}
        label={title}
        buttonLabel="Share Album"
      />
      <button
        disabled={pending}
        onClick={handleDelete}
        className="text-xs uppercase tracking-wider text-muted-2 hover:text-red-400 disabled:opacity-50"
      >
        Delete album
      </button>
    </div>
  );
}
