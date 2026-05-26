"use client";

import { useState, Suspense, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { HistoryPickerPanel } from "@/components/HistoryPickerPanel";
import { ProductDocumentLinks } from "@/components/ProductDocumentLinks";
import { filterItemHistory, lightingItemToTemplate } from "@/lib/itemHistory";
import { CatalogSpecEditor } from "@/components/CatalogSpecEditor";
import { CATALOG_IMPORTERS } from "@/lib/catalogImporters";
import { CATALOG_MARKS, DEFAULT_CATALOG_MARK } from "@/lib/catalogMarks";
import {
  formatLumens,
  mergeVariantIntoScraped,
  normalizeScraped,
} from "@/lib/scrapedData";
import { LightingItem, ProductVariant, SavedLightingTemplate, ScrapedData } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  Loader2,
  Wand2,
  Zap,
  Package,
  ExternalLink,
  CheckCircle2,
  Eye,
  ChevronLeft,
  X,
  Thermometer,
  Sun,
  Gauge,
  Maximize2,
  Bolt,
  Building2,
  History,
  Layers,
  Link2,
  Plus,
} from "lucide-react";

const CONTROL_METHODS = [
  "ON/OFF",
  "Phase Cut",
  "TRIAC",
  "0-10V",
  "DALI",
  "DALI2",
  "Push DIM",
  "Casambi",
  "DMX",
  "KNX",
  "Wireless",
  "Bluetooth Mesh",
  "ללא עמעום",
];
const AUX_EQUIPMENT_LOCATIONS = [
  "דרייבר/ספק כח אינטגרלי",
  "דרייבר/ספק כח מקומי",
  "דרייבר/ספק כח מרוחק",
];

function resolveSelectedImages(scraped: ScrapedData): string[] {
  if (scraped.selected_image_urls?.length) return scraped.selected_image_urls;
  if (scraped.main_image_url) return [scraped.main_image_url];
  return [];
}

function VariantSpecBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums",
        className
      )}
    >
      {children}
    </span>
  );
}

function toggleSelectedImage(scraped: ScrapedData, url: string): ScrapedData {
  const current = resolveSelectedImages(scraped);
  const next = current.includes(url)
    ? current.filter((u) => u !== url)
    : [...current, url];
  return {
    ...scraped,
    selected_image_urls: next,
    main_image_url: next[0] ?? null,
  };
}

function galleryImageUrls(scraped: ScrapedData): string[] {
  const urls = scraped.image_urls ?? [];
  if (urls.length > 0) return urls;
  if (scraped.main_image_url) return [scraped.main_image_url];
  return [];
}

function addGalleryImageUrl(scraped: ScrapedData, rawUrl: string): ScrapedData | "invalid" | "duplicate" {
  const url = rawUrl.trim();
  if (!url) return "invalid";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "invalid";
  } catch {
    return "invalid";
  }
  const existing = galleryImageUrls(scraped);
  if (existing.includes(url)) return "duplicate";
  return { ...scraped, image_urls: [...existing, url] };
}

function ImageLightbox({
  urls,
  index,
  isSelected,
  onClose,
  onNavigate,
  onToggleSelect,
}: {
  urls: string[];
  index: number;
  isSelected: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleSelect: () => void;
}) {
  const url = urls[index];
  const hasPrev = index > 0;
  const hasNext = index < urls.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(index - 1);
  }, [hasPrev, index, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(index + 1);
  }, [hasNext, index, onNavigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="סגור"
      >
        <X className="h-5 w-5" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="תמונה קודמת"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="תמונה הבאה"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      <div
        className="relative flex max-h-[90vh] max-w-[min(92vw,900px)] flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="תצוגה מוגדלת"
          className="max-h-[75vh] max-w-full object-contain rounded-lg bg-white/5"
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-white/80">
            {index + 1} / {urls.length}
          </span>
          <button
            type="button"
            onClick={onToggleSelect}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              isSelected
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-white/15 text-white hover:bg-white/25"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSelected ? "מסומן — לחץ לביטול" : "סמן תמונה"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
        "outline-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}

function SpecBadge({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 bg-white border border-amber-100 rounded-xl px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function ItemFormContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const floorId = params.floorId as string;
  const editId = searchParams.get("edit");

  const { projects, addItem, updateItem, itemHistory, saveItemTemplate, removeItemTemplate } =
    useStore();
  const project = projects.find((p) => p.id === projectId);
  const floor = project?.floors.find((f) => f.id === floorId);
  const editItem = editId ? floor?.items.find((i) => i.id === editId) : undefined;

  const [sectionId, setSectionId] = useState(editItem?.section_id ?? 1);
  const [mark, setMark] = useState(
    () => editItem?.mark ?? DEFAULT_CATALOG_MARK
  );
  const [productUrl, setProductUrl] = useState(editItem?.product_url ?? "");
  const [driverLocation, setDriverLocation] = useState(
    editItem?.driver_location ?? "דרייבר/ספק כח מרוחק",
  );
  const [dimmingMethod, setDimmingMethod] = useState(editItem?.dimming_method ?? "ללא עמעום");
  const [importer, setImporter] = useState(editItem?.importer ?? "");
  const [unitType, setUnitType] = useState<"יח'" | "מטר">(editItem?.unit_type ?? "יח'");
  const [pricePerUnit, setPricePerUnit] = useState(editItem?.price_per_unit ?? 0);
  const [roomSelections, setRoomSelections] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    editItem?.rooms.forEach((r) => { m[r.room_id] = r.qty; });
    return m;
  });
  const [scraped, setScraped] = useState<ScrapedData>(() => {
    const base = normalizeScraped(editItem?.scraped);
    const withDesc =
      !base.product_description && editItem?.body_description
        ? { ...base, product_description: editItem.body_description }
        : base;
    const selected = resolveSelectedImages(withDesc);
    return {
      ...withDesc,
      selected_image_urls: selected,
      main_image_url: selected[0] ?? withDesc.main_image_url,
    };
  });
  const selectedImages = resolveSelectedImages(scraped);
  const galleryUrls = useMemo(() => galleryImageUrls(scraped), [scraped]);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customImageError, setCustomImageError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [pendingVariants, setPendingVariants] = useState<{ base: ScrapedData; variants: ProductVariant[] } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const filteredHistory = useMemo(
    () => filterItemHistory(itemHistory, historySearch),
    [itemHistory, historySearch]
  );

  const hasScrapedData = !!(
    scraped.product_name || scraped.manufacturer || scraped.product_description
  );
  const productReady = hasScrapedData;
  const totalUnitsPreview = Object.values(roomSelections).reduce((s, q) => s + q, 0);

  if (!project || !floor) return null;

  const buildScrapedState = (data: ScrapedData, variant?: ProductVariant): ScrapedData => {
    const merged = normalizeScraped(
      variant ? mergeVariantIntoScraped(data, variant) : data
    );
    const desc =
      merged.product_description?.trim() ||
      [merged.product_name, merged.manufacturer, merged.model].filter(Boolean).join(" · ");
    const urls = merged.image_urls ?? [];
    const defaultSelected =
      merged.main_image_url && urls.includes(merged.main_image_url)
        ? [merged.main_image_url]
        : urls.length > 0
          ? [urls[0]]
          : merged.main_image_url
            ? [merged.main_image_url]
            : [];
    return {
      ...merged,
      product_description: desc || merged.product_description,
      selected_image_urls: defaultSelected,
      main_image_url: defaultSelected[0] ?? merged.main_image_url,
    };
  };

  const handleScrape = async () => {
    if (!productUrl.trim()) return;
    setScrapeLoading(true);
    setScrapeError("");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "שגיאה בשליפת נתונים מהאתר";
        throw new Error(msg);
      }
      const data = normalizeScraped(body as ScrapedData);
      if (data.variants && data.variants.length > 1) {
        setPendingVariants({ base: data, variants: data.variants });
      } else {
        setScraped(buildScrapedState(data));
      }
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "שגיאה בשליפה");
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    if (!pendingVariants) return;
    setScraped(buildScrapedState(pendingVariants.base, variant));
    setPendingVariants(null);
  };

  const handleDismissVariants = () => {
    if (!pendingVariants) return;
    setScraped(buildScrapedState(pendingVariants.base));
    setPendingVariants(null);
  };

  const handleAddCustomImage = () => {
    setCustomImageError("");
    const url = customImageUrl.trim();
    const result = addGalleryImageUrl(scraped, url);
    if (result === "invalid") {
      setCustomImageError("הזן קישור תקין (http או https)");
      return;
    }
    if (result === "duplicate") {
      setCustomImageError("התמונה כבר ברשימה");
      return;
    }
    setScraped(toggleSelectedImage(result, url));
    setCustomImageUrl("");
  };

  const applyTemplate = (t: SavedLightingTemplate) => {
    setProductUrl(t.product_url);
    setDriverLocation(t.driver_location);
    setDimmingMethod(t.dimming_method);
    setUnitType(t.unit_type);
    setPricePerUnit(t.price_per_unit);
    const base = normalizeScraped(t.scraped);
    const withDesc =
      !base.product_description && t.body_description
        ? { ...base, product_description: t.body_description }
        : base;
    const selected = resolveSelectedImages(withDesc);
    setScraped({
      ...withDesc,
      selected_image_urls: selected,
      main_image_url: selected[0] ?? withDesc.main_image_url,
    });
    setScrapeError("");
    setHistoryOpen(false);
  };

  const handleSubmit = () => {
    const itemRooms = Object.entries(roomSelections)
      .filter(([, qty]) => qty > 0)
      .map(([room_id, qty]) => ({ room_id, qty }));
    const itemData: Omit<LightingItem, "id"> = {
      section_id: sectionId, mark, product_url: productUrl,
      driver_location: driverLocation,
      dimming_method: dimmingMethod,
      importer,
      body_description: scraped.product_description?.trim() || "",
      unit_type: unitType,
      price_per_unit: pricePerUnit, rooms: itemRooms, scraped,
      scraped_status: scraped.product_name ? "done" : "pending",
      accessories: editItem?.accessories ?? [],
    };
    saveItemTemplate(lightingItemToTemplate(itemData));
    if (editItem) updateItem(projectId, floorId, editItem.id, itemData);
    else addItem(projectId, floorId, { ...itemData, id: crypto.randomUUID() });
    router.push(`/project/${projectId}/floor/${floorId}/items`);
  };

  const toggleRoom = (roomId: string, checked: boolean) => {
    setRoomSelections((prev) => {
      if (checked) return { ...prev, [roomId]: 1 };
      const n = { ...prev }; delete n[roomId]; return n;
    });
  };

  return (
    <>
    {pendingVariants && (
      <Dialog open onOpenChange={(open) => { if (!open) handleDismissVariants(); }}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl" dir="rtl">
          <DialogHeader className="border-b border-border/60 bg-muted/25 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 text-right">
                <DialogTitle className="text-base">בחר דגם</DialogTitle>
                <DialogDescription className="text-xs leading-relaxed">
                  המוצר זמין ב-{pendingVariants.variants.length} דגמים — בחר את הדגם הרצוי
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[min(58vh,440px)] overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-2">
            {pendingVariants.variants.map((variant, i) => {
                const hasSpecs =
                  variant.color_temp_k != null ||
                  variant.watt_per_unit != null ||
                  variant.cri != null ||
                  variant.model ||
                  variant.voltage ||
                  variant.current ||
                  variant.max_ceiling_height_cm != null;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectVariant(variant)}
                    className="group w-full rounded-xl border border-border/70 bg-card p-4 text-right shadow-sm transition-all hover:border-amber-400/70 hover:bg-amber-50/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 active:scale-[0.995]"
                  >
                    <div className="flex items-start gap-3">
                      <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {variant.label.replace(/\s+/g, " ").trim()}
                        </p>
                        {hasSpecs && (
                          <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
                            {variant.color_temp_k != null && (
                              <VariantSpecBadge className="bg-amber-100/90 text-amber-800">
                                <Thermometer className="h-3 w-3 opacity-70" />
                                {variant.color_temp_k}K
                              </VariantSpecBadge>
                            )}
                            {variant.watt_per_unit != null && (
                              <VariantSpecBadge className="bg-slate-100 text-slate-700">
                                <Zap className="h-3 w-3 opacity-60" />
                                {variant.watt_per_unit}W
                              </VariantSpecBadge>
                            )}
                            {variant.cri != null && (
                              <VariantSpecBadge className="bg-sky-50 text-sky-700">
                                <Sun className="h-3 w-3 opacity-60" />
                                CRI {variant.cri}
                              </VariantSpecBadge>
                            )}
                            {variant.voltage && (
                              <VariantSpecBadge className="bg-violet-50 text-violet-700">
                                <Bolt className="h-3 w-3 opacity-60" />
                                {variant.voltage}
                              </VariantSpecBadge>
                            )}
                            {variant.current && (
                              <VariantSpecBadge className="bg-violet-50 text-violet-700">
                                {variant.current}
                              </VariantSpecBadge>
                            )}
                            {variant.max_ceiling_height_cm != null && (
                              <VariantSpecBadge className="bg-emerald-50 text-emerald-700">
                                <Maximize2 className="h-3 w-3 opacity-60" />
                                {variant.max_ceiling_height_cm} ס״מ
                              </VariantSpecBadge>
                            )}
                            {variant.model && (
                              <VariantSpecBadge className="bg-muted font-mono text-[10px] text-muted-foreground">
                                {variant.model}
                              </VariantSpecBadge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:justify-center">
            <button
              type="button"
              onClick={handleDismissVariants}
              className="w-full rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              דלג — השתמש בנתונים הכלליים
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    <div className="min-h-[calc(100vh-56px)] bg-background" dir="rtl">
      {/* Breadcrumb header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <button onClick={() => router.push("/")} className="hover:text-foreground transition-colors">פרויקטים</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => router.push(`/project/${projectId}`)} className="hover:text-foreground transition-colors">{project.name}</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => router.push(`/project/${projectId}/floor/${floorId}/items`)} className="hover:text-foreground transition-colors">{floor.name}</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{editItem ? "עריכת גוף" : "הוספת גוף"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div
          className={cn(
            "grid grid-cols-1 gap-8",
            productReady && "xl:grid-cols-[1fr_380px]"
          )}
        >

          {/* ─── MAIN FORM ─── */}
          <div className="space-y-7">

            {/* Identity row */}
            <div className="grid grid-cols-[1fr_130px] gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <SectionBox title="זיהוי">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="סעיף">
                      <Input type="number" min={1} value={sectionId}
                        onChange={(e) => setSectionId(Number(e.target.value))}
                        className="h-11 text-lg font-bold text-center" />
                    </F>
                    <F label="סימון">
                      <NativeSelect
                        value={mark}
                        onChange={(e) => setMark(e.target.value)}
                        className="text-lg font-bold text-center"
                      >
                        {CATALOG_MARKS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        {!CATALOG_MARKS.includes(mark as (typeof CATALOG_MARKS)[number]) && (
                          <option value={mark}>{mark}</option>
                        )}
                      </NativeSelect>
                    </F>
                  </div>
                </SectionBox>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1">
                <span className="text-3xl font-black text-amber-600">{mark}</span>
                <span className="text-xs text-amber-500 font-medium">סעיף {sectionId}</span>
              </div>
            </div>

            {/* History + product URL */}
            <div className="space-y-4">
              {itemHistory.length > 0 && (
                <div
                  className={cn(
                    "bg-card border rounded-2xl overflow-hidden flex flex-col",
                    !productReady ? "border-amber-200 shadow-sm" : "border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((o) => !o)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-3.5 transition-colors shrink-0",
                      !productReady ? "bg-amber-50/80 hover:bg-amber-50" : "hover:bg-secondary/40"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <History className="w-4 h-4 text-amber-500" />
                      {productReady ? "בחר מגוף קודם" : "בחר גוף תאורה שהכנסת בעבר"}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({itemHistory.length})
                      </span>
                    </span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        historyOpen && "rotate-90"
                      )}
                    />
                  </button>
                  {historyOpen && (
                    <HistoryPickerPanel
                      itemHistory={itemHistory}
                      filteredHistory={filteredHistory}
                      historySearch={historySearch}
                      onSearchChange={setHistorySearch}
                      onApply={applyTemplate}
                      onRemove={removeItemTemplate}
                    />
                  )}
                </div>
              )}

              {!productReady && itemHistory.length > 0 && (
                <div className="flex items-center gap-3 px-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    או הכניסי לינק חדש
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl p-5">
                <SectionBox title="קישור מוצר">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                      dir="ltr"
                      className="flex-1 font-mono text-sm h-11"
                    />
                    <button
                      onClick={handleScrape}
                      disabled={scrapeLoading || !productUrl.trim()}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold px-4 h-11 rounded-xl transition-colors whitespace-nowrap"
                    >
                      {scrapeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      משוך נתונים
                    </button>
                    {productUrl && (
                      <a href={productUrl} target="_blank" rel="noopener noreferrer"
                        className="h-11 w-11 flex items-center justify-center border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {scrapeError && (
                    <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{scrapeError}</p>
                  )}
                  {hasScrapedData && !scrapeLoading && (
                    <p className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" /> נתונים נמשכו בהצלחה — ניתן לעריכה בפאנל המוצר
                    </p>
                  )}
                </SectionBox>
              </div>

              {!productReady && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Link2 className="h-6 w-6" />
                  </div>
                  <p className="text-base font-semibold text-foreground leading-relaxed">
                    {itemHistory.length > 0
                      ? "הכניסי לינק למוצר חדש, או בחרי גוף תאורה מהרשימה למעלה"
                      : "אנא הכניסי לינק למוצר על מנת שהמערכת תטען את המוצר"}
                  </p>
                  {productUrl.trim() && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      לאחר הכנסת הקישור, לחצי על «משוך נתונים» לטעינת פרטי המוצר
                    </p>
                  )}
                </div>
              )}
            </div>

            {productReady && (
            <>
            {/* Manual specs */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <SectionBox title="מפרט ידני">
                <div className="grid grid-cols-2 gap-4">
                  <F label="מיקום ציוד עזר">
                    <NativeSelect value={driverLocation} onChange={(e) => setDriverLocation(e.target.value)}>
                      {AUX_EQUIPMENT_LOCATIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </NativeSelect>
                  </F>
                  <F label="שיטת שליטה">
                    <NativeSelect value={dimmingMethod} onChange={(e) => setDimmingMethod(e.target.value)}>
                      {CONTROL_METHODS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </NativeSelect>
                  </F>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <F label="יחידת מידה">
                    <NativeSelect
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value as "יח'" | "מטר")}
                    >
                      <option value="יח'">{"יח'"}</option>
                      <option value="מטר">מטר</option>
                    </NativeSelect>
                  </F>
                  <F label="מחיר ליחידה (₪)">
                    <Input type="number" min={0} value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(Number(e.target.value))}
                      className="h-11 text-base font-semibold" />
                  </F>
                  <F label="יבואן">
                    <NativeSelect value={importer} onChange={(e) => setImporter(e.target.value)}>
                      <option value="">—</option>
                      {CATALOG_IMPORTERS.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      {importer && !CATALOG_IMPORTERS.includes(importer as (typeof CATALOG_IMPORTERS)[number]) && (
                        <option value={importer}>{importer}</option>
                      )}
                    </NativeSelect>
                  </F>
                </div>
              </SectionBox>
            </div>

            {/* Rooms */}
            {floor.rooms.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <SectionBox title={`חדרים וכמויות`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {floor.rooms.map((room) => {
                      const selected = room.id in roomSelections;
                      return (
                        <label key={room.id}
                          className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                            selected ? "border-amber-300 bg-amber-50" : "border-border hover:border-amber-200 hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={selected} onCheckedChange={(c) => toggleRoom(room.id, !!c)}
                              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                            <span className="text-sm font-medium flex-1 truncate">{room.name}</span>
                          </div>
                          {selected && (
                            <Input type="number" min={1} value={roomSelections[room.id] ?? 1}
                              onChange={(e) => setRoomSelections((prev) => ({ ...prev, [room.id]: Number(e.target.value) }))}
                              onClick={(e) => e.stopPropagation()}
                              className="h-9 text-sm" placeholder="כמות" />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {totalUnitsPreview > 0 && (
                    <div className="flex items-center gap-5 bg-secondary rounded-xl px-4 py-3 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <strong className="text-foreground">{totalUnitsPreview}</strong> יחידות
                      </span>
                      {pricePerUnit > 0 && (
                        <span className="font-bold text-amber-600">₪{(totalUnitsPreview * pricePerUnit).toLocaleString()}</span>
                      )}
                      {scraped.watt_per_unit && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Zap className="w-3.5 h-3.5" />{totalUnitsPreview * scraped.watt_per_unit}W
                        </span>
                      )}
                    </div>
                  )}
                </SectionBox>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => router.push(`/project/${projectId}/floor/${floorId}/items`)}
                className="flex-1 h-12 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                ביטול
              </button>
              <button onClick={handleSubmit}
                className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors shadow-sm">
                {editItem ? "שמור שינויים" : "הוסף גוף תאורה"}
              </button>
            </div>
            </>
            )}

            {!productReady && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/project/${projectId}/floor/${floorId}/items`)}
                  className="w-full h-12 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          {/* ─── PRODUCT DATA PANEL ─── */}
          {productReady && (
          <div className="space-y-4">
            <div className="sticky top-[80px]">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                  {/* Product image / gallery picker */}
                  <div className="bg-white border-b border-amber-100 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-amber-700/70 font-medium">תמונות מוצר — בחר אחת או יותר</p>
                        <span className="text-xs text-amber-600 font-semibold shrink-0">
                          נבחרו {selectedImages.length}
                        </span>
                      </div>
                      {galleryUrls.length > 0 && (
                      <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto">
                        {galleryUrls.map((imgUrl, imgIndex) => {
                          const isSelected = selectedImages.includes(imgUrl);
                          return (
                            <div
                              key={imgUrl}
                              className={`relative rounded-lg border-2 overflow-hidden aspect-square bg-white transition-all ${
                                isSelected
                                  ? "border-amber-500 ring-2 ring-amber-300"
                                  : "border-transparent hover:border-amber-200"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setScraped((p) => toggleSelectedImage(p, imgUrl))}
                                className="absolute inset-0 w-full h-full"
                                aria-label={isSelected ? "בטל סימון" : "סמן תמונה"}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgUrl} alt="" className="w-full h-full object-contain p-0.5 pointer-events-none"
                                  onError={(e) => { const p = (e.target as HTMLElement).parentElement; if (p) p.style.display = "none"; }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setLightboxIndex(imgIndex)}
                                className="absolute bottom-0.5 right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white hover:bg-black/75 transition-colors"
                                aria-label="הצג בגדול"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {isSelected && (
                                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm pointer-events-none">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      )}
                      {lightboxIndex !== null && galleryUrls.length > 0 && (
                        <ImageLightbox
                          urls={galleryUrls}
                          index={lightboxIndex}
                          isSelected={selectedImages.includes(galleryUrls[lightboxIndex])}
                          onClose={() => setLightboxIndex(null)}
                          onNavigate={setLightboxIndex}
                          onToggleSelect={() =>
                            setScraped((p) => toggleSelectedImage(p, galleryUrls[lightboxIndex]))
                          }
                        />
                      )}
                      {selectedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedImages.map((imgUrl) => {
                            const imgIndex = galleryUrls.indexOf(imgUrl);
                            return (
                              <div key={imgUrl} className="relative border border-amber-100 rounded-lg p-2 flex justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgUrl} alt="product" className="max-h-24 max-w-full object-contain" />
                                {imgIndex >= 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxIndex(imgIndex)}
                                    className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white hover:bg-black/75 transition-colors"
                                    aria-label="הצג בגדול"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Input
                          placeholder="https://... קישור לתמונה"
                          value={customImageUrl}
                          onChange={(e) => {
                            setCustomImageUrl(e.target.value);
                            if (customImageError) setCustomImageError("");
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCustomImage()}
                          dir="ltr"
                          className="flex-1 font-mono text-xs h-9"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomImage}
                          disabled={!customImageUrl.trim()}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold px-3 h-9 rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          הוסף תמונה
                        </button>
                      </div>
                      {customImageError && (
                        <p className="text-xs text-red-500">{customImageError}</p>
                      )}
                    </div>

                  <div className="p-5 space-y-4">
                    <ProductDocumentLinks
                      techSpecUrl={scraped.tech_spec_url}
                      mountingInstructionsUrl={scraped.mounting_instructions_url}
                    />
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">מידע מהאתר</p>
                    {/* Name + manufacturer */}
                    <div>
                      <p className="text-xs font-medium text-amber-700/60 mb-1">מוצר</p>
                      {scraped.product_name && (
                        <p className="font-bold text-foreground text-base leading-snug">{scraped.product_name}</p>
                      )}
                      {scraped.manufacturer && (
                        <p className="text-sm text-muted-foreground mt-0.5">{scraped.manufacturer} {scraped.model ? `· ${scraped.model}` : ""}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-amber-700/60">תיאור מוצר</Label>
                      <textarea
                        value={scraped.product_description ?? ""}
                        onChange={(e) =>
                          setScraped((p) => ({
                            ...p,
                            product_description: e.target.value || null,
                          }))
                        }
                        placeholder="תיאור המוצר כפי שנמשך מהאתר..."
                        rows={4}
                        className="w-full min-h-[88px] resize-y rounded-lg border border-amber-100 bg-white px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-amber-300 focus-visible:ring-3 focus-visible:ring-amber-300/40"
                      />
                    </div>

                    {/* Spec badges */}
                    <div className="grid grid-cols-2 gap-2">
                      <SpecBadge icon={Thermometer} label="טמפ׳ צבע" value={scraped.color_temp_k ? `${scraped.color_temp_k}K` : null} />
                      <SpecBadge icon={Sun} label="CRI" value={scraped.cri} />
                      <SpecBadge icon={Zap} label="וואט/יחידה" value={scraped.watt_per_unit ? `${scraped.watt_per_unit}W` : null} />
                      <SpecBadge icon={Gauge} label="מתח" value={scraped.voltage} />
                      <SpecBadge icon={Bolt} label="זרם" value={scraped.current} />
                      <SpecBadge icon={Maximize2} label="גובה תקרה מקס׳" value={scraped.max_ceiling_height_cm ? `${scraped.max_ceiling_height_cm} ס״מ` : null} />
                      <SpecBadge icon={Sun} label="לומן" value={formatLumens(scraped.lumens)} />
                      <SpecBadge icon={Gauge} label="IP" value={scraped.ip_rating ?? null} />
                    </div>

                    {/* Editable fields */}
                    <div className="border-t border-amber-100 pt-4 space-y-3">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">עריכה ידנית</p>
                      <EditField label="שם מוצר" value={scraped.product_name}
                        onChange={(v) => setScraped((p) => ({ ...p, product_name: v || null }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <EditField label="יצרן" value={scraped.manufacturer}
                          onChange={(v) => setScraped((p) => ({ ...p, manufacturer: v || null }))} />
                        <EditField label="דגם" value={scraped.model}
                          onChange={(v) => setScraped((p) => ({ ...p, model: v || null }))} />
                        <EditField label="טמפ׳ (K)" value={scraped.color_temp_k?.toString() ?? null}
                          onChange={(v) => setScraped((p) => ({ ...p, color_temp_k: v ? Number(v) : null }))} type="number" />
                        <EditField label="CRI" value={scraped.cri?.toString() ?? null}
                          onChange={(v) => setScraped((p) => ({ ...p, cri: v ? Number(v) : null }))} type="number" />
                        <EditField label="ואט" value={scraped.watt_per_unit?.toString() ?? null}
                          onChange={(v) => setScraped((p) => ({ ...p, watt_per_unit: v ? Number(v) : null }))} type="number" />
                        <EditField label="גובה תקרה" value={scraped.max_ceiling_height_cm?.toString() ?? null}
                          onChange={(v) => setScraped((p) => ({ ...p, max_ceiling_height_cm: v ? Number(v) : null }))} type="number" />
                        <EditField label="מתח" value={scraped.voltage}
                          onChange={(v) => setScraped((p) => ({ ...p, voltage: v || null }))} />
                        <EditField label="זרם" value={scraped.current}
                          onChange={(v) => setScraped((p) => ({ ...p, current: v || null }))} />
                      </div>
                      <CatalogSpecEditor scraped={scraped} onChange={setScraped} />
                    </div>
                  </div>
                </div>

              {/* Description card (if product has rooms) */}
              {floor.rooms.length === 0 && (
                <div className="mt-4 bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">אין חדרים מוגדרים</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/project/${projectId}/floor/${floorId}/setup`)}
                        className="text-amber-600 hover:underline mt-1"
                      >
                        הגדר חדרים לקומה זו
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
    </>
  );
}

function EditField({ label, value, onChange, type = "text" }: {
  label: string; value: string | null; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-amber-700/60">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm bg-white border-amber-100 focus-visible:ring-amber-300" />
    </div>
  );
}

export default function ItemPage() {
  return (
    <Suspense>
      <ItemFormContent />
    </Suspense>
  );
}
