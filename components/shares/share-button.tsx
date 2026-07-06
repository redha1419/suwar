"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShareLink } from "@/lib/share/actions";

export function ShareButton({
  scope,
  targetId,
  label,
  buttonLabel = "Share",
  buttonClassName,
}: {
  scope: "photo" | "album" | "all";
  targetId: string | null;
  label?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleCreate() {
    setPending(true);
    try {
      const link = await createShareLink(scope, targetId, label);
      if (link) setUrl(`${window.location.origin}/s/${link.token}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (url) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-xs">
        <span className="max-w-[16rem] truncate text-muted">{url}</span>
        <button
          onClick={handleCopy}
          className="text-foreground hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={() => setUrl(null)}
          className="text-muted-2 hover:text-foreground/80"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={handleCreate}
      className={
        buttonClassName ??
        "rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface disabled:opacity-50"
      }
    >
      {pending ? "Creating…" : buttonLabel}
    </button>
  );
}
