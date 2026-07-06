"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRawFileForever } from "@/lib/raw-files/actions";

export function RawFileRow({
  id,
  filename,
  extension,
  bytes,
}: {
  id: string;
  filename: string;
  extension: string;
  bytes: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${filename} permanently?`)) return;
    setPending(true);
    try {
      await deleteRawFileForever(id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-neutral-900 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs uppercase text-neutral-500">
          {extension}
        </span>
        <span className="text-neutral-200">{filename}</span>
        <span className="text-xs text-neutral-600">
          {(bytes / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>
      <div className="flex items-center gap-4">
        <a
          href={`/api/media/raw/${id}`}
          className="text-xs uppercase tracking-wider text-neutral-400 hover:text-neutral-100"
        >
          Download
        </a>
        <button
          disabled={pending}
          onClick={handleDelete}
          className="text-xs uppercase tracking-wider text-neutral-600 hover:text-red-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
