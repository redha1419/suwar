"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PresignedFile {
  pendingId: string;
  key: string;
  filename: string;
  uploadUrl: string;
}

interface FileProgress {
  filename: string;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);

      setBusy(true);
      setSummary(null);
      setProgress(
        files.map((f) => ({ filename: f.name, status: "uploading" }))
      );

      try {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            files.map((f) => ({
              filename: f.name,
              contentType: f.type || "application/octet-stream",
              size: f.size,
            }))
          ),
        });

        if (!presignRes.ok) {
          throw new Error(`Failed to get upload URLs (${presignRes.status})`);
        }

        const { files: presigned } = (await presignRes.json()) as {
          files: PresignedFile[];
        };

        await Promise.all(
          presigned.map(async (p, i) => {
            const file = files[i];
            const res = await fetch(p.uploadUrl, {
              method: "PUT",
              headers: {
                "content-type": file.type || "application/octet-stream",
              },
              body: file,
            });
            if (!res.ok) throw new Error(`Upload failed for ${p.filename}`);
          })
        );

        setProgress((prev) =>
          prev.map((p) => ({ ...p, status: "processing" }))
        );

        const finalizeRes = await fetch("/api/upload/finalize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            presigned.map((p) => ({
              key: p.key,
              filename: p.filename,
              contentType: files.find((f) => f.name === p.filename)?.type,
            }))
          ),
        });

        if (!finalizeRes.ok) {
          throw new Error(`Finalize failed (${finalizeRes.status})`);
        }

        const { results } = (await finalizeRes.json()) as {
          results: { filename: string; status: string; error?: string }[];
        };

        const photoCount = results.filter((r) => r.status === "photo").length;
        const rawCount = results.filter((r) =>
          r.status.startsWith("raw")
        ).length;
        const errorCount = results.filter(
          (r) => r.status === "error" || r.status === "skipped"
        ).length;

        setSummary(
          `Uploaded ${photoCount} photo${photoCount === 1 ? "" : "s"}` +
            (rawCount ? `, ${rawCount} RAW file${rawCount === 1 ? "" : "s"}` : "") +
            (errorCount ? `, ${errorCount} skipped/failed` : "")
        );
        setProgress([]);
        router.refresh();
      } catch (err) {
        setSummary((err as Error).message);
        setProgress([]);
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [router]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
        isDragging
          ? "border-neutral-400 bg-neutral-900"
          : "border-neutral-800 hover:border-neutral-600"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.cr2,.cr3,.nef,.arw,.dng,.raf,.orf,.rw2,.srw,.pef"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-sm text-neutral-300">
        {busy ? "Uploading…" : "Drag photos here, or click to select"}
      </p>
      <p className="text-xs text-neutral-600">
        JPEG, HEIC, TIFF, PNG — RAW files upload alongside a same-named JPEG
      </p>
      {progress.length > 0 && (
        <p className="text-xs text-neutral-500">
          {progress.length} file{progress.length === 1 ? "" : "s"}{" "}
          {progress[0]?.status}…
        </p>
      )}
      {summary && <p className="text-xs text-neutral-400">{summary}</p>}
    </div>
  );
}
