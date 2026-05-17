"use client";

import {
  formatTemplateSavedAt,
  getTemplateLabel,
  getTemplateSubtitle,
} from "@/lib/itemHistory";
import { SavedLightingTemplate } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Gauge,
  Package,
  Search,
  Sun,
  Thermometer,
  Trash2,
  X,
  Zap,
} from "lucide-react";

interface HistoryPickerPanelProps {
  itemHistory: SavedLightingTemplate[];
  filteredHistory: SavedLightingTemplate[];
  historySearch: string;
  onSearchChange: (q: string) => void;
  onApply: (t: SavedLightingTemplate) => void;
  onRemove: (id: string) => void;
}

export function HistoryPickerPanel({
  itemHistory,
  filteredHistory,
  historySearch,
  onSearchChange,
  onApply,
  onRemove,
}: HistoryPickerPanelProps) {
  return (
    <div className="border-t border-border">
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="חיפוש לפי שם, יצרן, דגם, עמעום..."
            value={historySearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pr-9 text-sm"
          />
          {historySearch && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
              aria-label="נקה חיפוש"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {historySearch && (
          <p className="text-xs text-muted-foreground mt-2 px-1">
            {filteredHistory.length} מתוך {itemHistory.length} תוצאות
          </p>
        )}
      </div>
      <div className="max-h-[min(420px,50vh)] overflow-y-auto px-3 pb-3 space-y-2">
        {filteredHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            לא נמצאו גופים התואמים לחיפוש
          </p>
        ) : (
          filteredHistory.map((t) => {
            const img =
              t.scraped?.main_image_url ||
              t.scraped?.selected_image_urls?.[0] ||
              t.scraped?.image_urls?.[0];
            const desc =
              t.scraped?.product_description?.trim() || t.body_description?.trim();
            let host = "";
            if (t.product_url) {
              try {
                host = new URL(t.product_url).hostname;
              } catch {
                host = "קישור";
              }
            }

            return (
              <div
                key={t.id}
                className="group flex gap-2 rounded-xl border border-border/80 bg-card p-2.5 shadow-sm hover:border-amber-300/80 hover:bg-amber-50/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onApply(t)}
                  className="flex-1 min-w-0 flex gap-3 text-right"
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-border shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-border bg-secondary/50 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-snug truncate">
                        {getTemplateLabel(t)}
                      </p>
                      {getTemplateSubtitle(t) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {getTemplateSubtitle(t)}
                        </p>
                      )}
                    </div>
                    {desc && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {desc}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {t.scraped?.color_temp_k != null && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                          <Thermometer className="w-2.5 h-2.5" />
                          {t.scraped.color_temp_k}K
                        </span>
                      )}
                      {t.scraped?.watt_per_unit != null && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                          <Zap className="w-2.5 h-2.5" />
                          {t.scraped.watt_per_unit}W
                        </span>
                      )}
                      {t.scraped?.cri != null && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                          <Sun className="w-2.5 h-2.5" />
                          CRI {t.scraped.cri}
                        </span>
                      )}
                      {t.scraped?.voltage && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                          <Gauge className="w-2.5 h-2.5" />
                          {t.scraped.voltage}
                        </span>
                      )}
                      <span className="rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        {t.dimming_method}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        {t.driver_location}
                      </span>
                      {t.price_per_unit > 0 && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          ₪{t.price_per_unit.toLocaleString()}/{t.unit_type}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/80">
                      {formatTemplateSavedAt(t.saved_at)}
                      {host && (
                        <>
                          <span className="mx-1">·</span>
                          <span
                            className="font-mono truncate inline-block max-w-[180px] align-bottom"
                            dir="ltr"
                          >
                            {host}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(t.id)}
                  className="self-start p-1.5 rounded-lg text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                  title="הסר מהרשימה"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
