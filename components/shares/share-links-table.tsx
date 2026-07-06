"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revokeShareLink } from "@/lib/share/actions";

export interface ShareLinkRowData {
  id: string;
  url: string;
  scope: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
  viewCount: number | null;
  lastAccessedAt: string | null;
}

export function ShareLinksTable({ links }: { links: ShareLinkRowData[] }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCopy(link: ShareLinkRowData) {
    await navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this link? Anyone with it will immediately lose access.")) {
      return;
    }
    setPendingId(id);
    try {
      await revokeShareLink(id);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (links.length === 0) {
    return (
      <p className="py-8 text-sm text-neutral-600">No share links yet.</p>
    );
  }

  return (
    <div className="flex flex-col">
      {links.map((link) => (
        <div
          key={link.id}
          className="flex items-center justify-between gap-4 border-b border-neutral-900 py-3"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] uppercase text-neutral-500">
                {link.scope}
              </span>
              <span className="text-neutral-200">
                {link.label ?? "Entire library"}
              </span>
              {link.revokedAt && (
                <span className="text-xs text-red-500">Revoked</span>
              )}
            </div>
            <p className="max-w-md truncate text-xs text-neutral-600">
              {link.url}
            </p>
            <p className="text-xs text-neutral-700">
              Created {new Date(link.createdAt).toLocaleDateString()} ·{" "}
              {link.viewCount ?? 0} view{link.viewCount === 1 ? "" : "s"}
              {link.lastAccessedAt &&
                ` · last viewed ${new Date(link.lastAccessedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!link.revokedAt && (
              <button
                onClick={() => handleCopy(link)}
                className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
              >
                {copiedId === link.id ? "Copied" : "Copy"}
              </button>
            )}
            {!link.revokedAt && (
              <button
                disabled={pendingId === link.id}
                onClick={() => handleRevoke(link.id)}
                className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-400 hover:bg-red-950 disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
