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
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-neutral-500"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        Create
      </button>
    </form>
  );
}
