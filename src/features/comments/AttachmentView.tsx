import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { getAttachmentSignedUrl } from "./uploadCommentAttachment";
import type { CommentAttachment } from "./types";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentView({ a }: { a: CommentAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAttachmentSignedUrl(a.path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [a.path]);

  if (error) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md bg-white/5 hairline px-2.5 py-1.5 text-xs text-dimmer">
        <FileText className="h-4 w-4" />
        <span className="max-w-[220px] truncate">{a.name}</span>
        <span>(unavailable)</span>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md bg-white/5 hairline px-2.5 py-1.5 text-xs text-dimmer">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="max-w-[220px] truncate">{a.name}</span>
      </div>
    );
  }

  if (a.kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={a.name}
          className="max-h-72 rounded-md hairline object-contain bg-black/20"
          loading="lazy"
        />
      </a>
    );
  }
  if (a.kind === "video") {
    return (
      <video
        src={url}
        controls
        className="max-h-80 rounded-md hairline bg-black/40 max-w-full"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={a.name}
      className="inline-flex items-center gap-2 rounded-md bg-white/5 hairline px-2.5 py-1.5 text-xs hover:bg-white/10"
    >
      <FileText className="h-4 w-4 text-dimmer" />
      <span className="max-w-[220px] truncate">{a.name}</span>
      <span className="text-dimmer">{formatBytes(a.size)}</span>
      <Download className="h-3 w-3 text-dimmer" />
    </a>
  );
}
