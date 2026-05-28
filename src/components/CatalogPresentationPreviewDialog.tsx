"use client";

import type {
  CatalogPresentationPreviewState,
  PresentationPreviewSlide,
} from "@/lib/catalogPresentationPreview";
import { previewImageSrc } from "@/lib/catalogPresentationPreview";
import { CATALOG_FOOTER_NOTES } from "@/lib/catalogPresentation";
import { triggerPresentationDownload } from "@/lib/exportPresentationBuilder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDown, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  preview: CatalogPresentationPreviewState | null;
};

function SpecRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex gap-2 text-xs border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function ProductPreviewSlide({
  slide,
  index,
}: {
  slide: Extract<PresentationPreviewSlide, { kind: "product" }>;
  index: number;
}) {
  const { ctx, imageUrls, layout } = slide;
  const manufacturer = ctx.manufacturerSuffix.replace(/^_/, "").trim();

  return (
    <article className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="bg-secondary/50 border-b border-border px-4 py-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">שקף {index}</span>
        <span className="font-bold text-amber-600">{ctx.mark}</span>
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4" dir="rtl">
        <div
          className={
            layout === "two"
              ? "grid grid-rows-2 gap-2 min-h-[280px]"
              : "flex items-center justify-center min-h-[280px] bg-secondary/20 rounded-lg"
          }
        >
          {imageUrls.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground col-span-full">
              אין תמונות נבחרות
            </div>
          ) : (
            imageUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={previewImageSrc(url)}
                alt=""
                className="w-full h-full min-h-[120px] object-contain bg-white rounded-lg border border-border"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  if (!el.dataset.fallback && !url.startsWith("/")) {
                    el.dataset.fallback = "1";
                    el.src = url;
                  }
                }}
              />
            ))
          )}
        </div>
        <div className="space-y-3 min-w-0">
          <div>
            <h3 className="text-base font-bold text-foreground leading-snug">
              {ctx.productTitle}
              {manufacturer ? ` | ${manufacturer}` : ""}
            </h3>
            {ctx.roomNames && (
              <p className="text-xs text-muted-foreground mt-1">מיקום: {ctx.roomNames}</p>
            )}
          </div>
          {ctx.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {ctx.description}
            </p>
          )}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-0">
            <SpecRow label='מק"ט' value={ctx.sku} />
            <SpecRow label="CRI" value={ctx.cri} />
            <SpecRow label="לומן" value={ctx.lumens} />
            <SpecRow label="טמפ׳ צבע" value={ctx.colorTemp} />
            <SpecRow label="וואט" value={ctx.watt} />
            <SpecRow label="מתח/זרם" value={ctx.voltageCurrent} />
            <SpecRow label={ctx.unitLabel || "כמות"} value={ctx.totalUnits} />
            <SpecRow label="IP" value={ctx.ip} />
            <SpecRow label="שליטה" value={ctx.dimmingMethod} />
            <SpecRow label="דרייבר" value={ctx.driverLocation} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ctx.productUrl && (
              <a
                href={ctx.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 underline"
              >
                קישור מוצר
              </a>
            )}
            {ctx.mountingUrl && (
              <a
                href={ctx.mountingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 underline"
              >
                הוראות התקנה
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-secondary/30 px-4 py-2 text-[10px] text-muted-foreground space-y-0.5">
        {CATALOG_FOOTER_NOTES.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </article>
  );
}

export function CatalogPresentationPreviewDialog({
  open,
  onOpenChange,
  loading,
  preview,
}: Props) {
  const handleDownloadPptx = () => {
    if (!preview) return;
    triggerPresentationDownload(preview.blob, preview.filename);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        showCloseButton
        className="sm:max-w-5xl w-[calc(100%-1.5rem)] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden"
      >
        <div className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
          <DialogHeader className="gap-0.5 text-right">
            <DialogTitle className="text-base">תצוגה מקדימה — מצגת קטלוג</DialogTitle>
            {preview && (
              <p className="text-xs text-muted-foreground font-normal">
                {preview.slides.length} שקפים · {preview.filename}
              </p>
            )}
          </DialogHeader>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPptx}
              disabled={!preview || loading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4" />
              הורד PPTX
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">בונה מצגת...</p>
            </div>
          )}

          {!loading && preview && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {preview.imageWarnings.length > 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {preview.imageWarnings.length} תמונות לא נטענו — ייתכן מסגרת ריקה ב-PPTX.
                </p>
              )}
              {preview.slides.map((slide, i) => {
                if (slide.kind === "cover") {
                  return (
                    <article
                      key={`cover-${i}`}
                      className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex flex-col items-center justify-center text-center text-white shadow-md p-8"
                    >
                      <p className="text-sm text-slate-300 mb-2">שקף {i + 1} · שער</p>
                      <h2 className="text-3xl font-bold mb-2">{slide.projectName}</h2>
                      {slide.floorName && (
                        <p className="text-xl text-slate-200">{slide.floorName}</p>
                      )}
                      <p className="text-sm text-slate-400 mt-6">
                        {slide.editionLine} · {slide.year}
                      </p>
                    </article>
                  );
                }
                return (
                  <ProductPreviewSlide key={`product-${i}-${slide.ctx.mark}`} slide={slide} index={i + 1} />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
