"use client";

import type { ScrapedData } from "@/types";
import { resolveSelectedImageUrls } from "@/lib/scrapedData";
import { ImageIcon } from "lucide-react";

function imageSrc(url: string): string {
  if (url.startsWith("/")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function SelectedImageThumbnails({
  scraped,
  max = 3,
}: {
  scraped?: ScrapedData | null;
  max?: number;
}) {
  const urls = resolveSelectedImageUrls(scraped);
  if (!urls.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ImageIcon className="w-3.5 h-3.5 opacity-40" />
        —
      </span>
    );
  }

  const shown = urls.slice(0, max);
  const extra = urls.length - shown.length;

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      onClick={(e) => e.stopPropagation()}
      title={`${urls.length} תמונות נבחרות למצגת`}
    >
      {shown.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={imageSrc(url)}
          alt=""
          loading="lazy"
          className="w-9 h-9 rounded-md object-cover border border-border bg-white shrink-0 shadow-sm"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (!el.dataset.fallback && !url.startsWith("/")) {
              el.dataset.fallback = "1";
              el.src = url;
            }
          }}
        />
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md shrink-0">
          +{extra}
        </span>
      )}
    </div>
  );
}
