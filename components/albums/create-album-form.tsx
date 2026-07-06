"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAlbum } from "@/lib/albums/actions";

export function CreateAlbumForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    try {
      await createAlbum(title.trim());
      setTitle("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New album name…"
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-2 outline-none focus:border-muted"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        Create
      </button>
    </form>
  );
}
