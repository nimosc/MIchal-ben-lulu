"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { CatalogSpecEditor } from "@/components/CatalogSpecEditor";
import { ProductDocumentLinks } from "@/components/ProductDocumentLinks";
import { formatLumens, normalizeScraped } from "@/lib/scrapedData";
import { Accessory, ScrapedData } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  Loader2,
  Wand2,
  Package,
  ExternalLink,
  CheckCircle2,
  Zap,
  Thermometer,
  Sun,
  Gauge,
  Maximize2,
  Bolt,
} from "lucide-react";

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

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
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

function AccessoryFormContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const floorId = params.floorId as string;
  const itemId = params.itemId as string;
  const editId = searchParams.get("edit");

  const { projects, addAccessory, updateAccessory } = useStore();
  const project = projects.find((p) => p.id === projectId);
  const floor = project?.floors.find((f) => f.id === floorId);
  const parentItem = floor?.items.find((i) => i.id === itemId);
  const editAccessory = editId ? parentItem?.accessories?.find((a) => a.id === editId) : undefined;

  const [productUrl, setProductUrl] = useState(editAccessory?.product_url ?? "");
  const [unitType, setUnitType] = useState<"יח'" | "מטר">(editAccessory?.unit_type ?? "יח'");
  const [pricePerUnit, setPricePerUnit] = useState(editAccessory?.price_per_unit ?? 0);
  const [roomSelections, setRoomSelections] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    editAccessory?.rooms.forEach((r) => { m[r.room_id] = r.qty; });
    return m;
  });
  const [scraped, setScraped] = useState<ScrapedData>(() =>
    normalizeScraped(editAccessory?.scraped)
  );
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  const hasScrapedData = !!(scraped.product_name || scraped.manufacturer || scraped.product_description);
  const totalUnitsPreview = Object.values(roomSelections).reduce((s, q) => s + q, 0);

  if (!project || !floor || !parentItem) return null;

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
      const desc =
        data.product_description?.trim() ||
        [data.product_name, data.manufacturer, data.model].filter(Boolean).join(" · ");
      const urls = data.image_urls ?? [];
      const defaultSelected =
        data.main_image_url && urls.includes(data.main_image_url)
          ? [data.main_image_url]
          : urls.length > 0
            ? [urls[0]]
            : data.main_image_url
              ? [data.main_image_url]
              : [];
      setScraped({
        ...data,
        product_description: desc || data.product_description,
        selected_image_urls: defaultSelected,
        main_image_url: defaultSelected[0] ?? data.main_image_url,
      });
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "שגיאה בשליפה");
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleSubmit = () => {
    const itemRooms = Object.entries(roomSelections)
      .filter(([, qty]) => qty > 0)
      .map(([room_id, qty]) => ({ room_id, qty }));
    const accessoryData: Omit<Accessory, "id"> = {
      product_url: productUrl,
      body_description: scraped.product_description?.trim() || "",
      unit_type: unitType,
      price_per_unit: pricePerUnit,
      rooms: itemRooms,
      scraped,
      scraped_status: scraped.product_name ? "done" : "pending",
    };
    if (editAccessory) {
      updateAccessory(projectId, floorId, itemId, editAccessory.id, accessoryData);
    } else {
      addAccessory(projectId, floorId, itemId, { ...accessoryData, id: crypto.randomUUID() });
    }
    router.push(`/project/${projectId}/floor/${floorId}/items`);
  };

  const toggleRoom = (roomId: string, checked: boolean) => {
    setRoomSelections((prev) => {
      if (checked) return { ...prev, [roomId]: 1 };
      const n = { ...prev }; delete n[roomId]; return n;
    });
  };

  const itemLabel = parentItem.scraped?.product_name || parentItem.body_description || parentItem.mark;

  return (
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
            <span className="text-foreground/70 truncate max-w-[160px]">{itemLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{editAccessory ? "עריכת אביזר" : "הוספת אביזר"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Parent item context banner */}
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm">{parentItem.mark}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-amber-600 font-medium">אביזר לגוף תאורה</p>
            <p className="text-sm font-semibold text-foreground truncate">{itemLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">

          {/* ─── MAIN FORM ─── */}
          <div className="space-y-7">

            {/* Product URL */}
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
                    <CheckCircle2 className="w-4 h-4" /> נתונים נמשכו בהצלחה — ניתן לעריכה בצד שמאל
                  </p>
                )}
                <ProductDocumentLinks
                  techSpecUrl={scraped.tech_spec_url}
                  mountingInstructionsUrl={scraped.mounting_instructions_url}
                  className="pt-1"
                />
              </SectionBox>
            </div>

            {/* Price & unit */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <SectionBox title="מפרט">
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
                  <F label="מחיר ליחידה לפני מע״מ (₪)">
                    <Input type="number" min={0} value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(Number(e.target.value))}
                      className="h-11 text-base font-semibold" />
                  </F>
                </div>
              </SectionBox>
            </div>

            {/* Rooms */}
            {floor.rooms.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <SectionBox title="חדרים וכמויות">
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
                        <strong className="text-foreground">{totalUnitsPreview}</strong>{" "}
                        {unitType === "מטר" ? "מ'" : "יח'"}
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
                {editAccessory ? "שמור שינויים" : "הוסף אביזר"}
              </button>
            </div>
          </div>

          {/* ─── PRODUCT DATA PANEL ─── */}
          <div className="space-y-4">
            <div className="sticky top-[80px]">
              {!hasScrapedData ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <Wand2 className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">אין נתוני מוצר עדיין</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[200px]">הכנס קישור ולחץ &quot;משוך נתונים&quot; לשליפה אוטומטית</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                  {scraped.main_image_url && (
                    <div className="bg-white border-b border-amber-100 p-6 flex items-center justify-center min-h-[180px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scraped.main_image_url} alt="product"
                        className="max-h-44 max-w-full object-contain" />
                    </div>
                  )}
                  <div className="p-5 space-y-4">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">מידע מהאתר</p>
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
                          setScraped((p) => ({ ...p, product_description: e.target.value || null }))
                        }
                        placeholder="תיאור המוצר כפי שנמשך מהאתר..."
                        rows={4}
                        className="w-full min-h-[88px] resize-y rounded-lg border border-amber-100 bg-white px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-amber-300 focus-visible:ring-3 focus-visible:ring-amber-300/40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <SpecBadge icon={Thermometer} label="טמפ׳ צבע" value={scraped.color_temp_k ? `${scraped.color_temp_k}K` : null} />
                      <SpecBadge icon={Sun} label="CRI" value={scraped.cri} />
                      <SpecBadge
                        icon={Zap}
                        label={unitType === "מטר" ? "וואט/מ'" : "וואט/יח'"}
                        value={scraped.watt_per_unit ? `${scraped.watt_per_unit}W` : null}
                      />
                      <SpecBadge icon={Gauge} label="מתח" value={scraped.voltage} />
                      <SpecBadge icon={Bolt} label="זרם" value={scraped.current} />
                      <SpecBadge icon={Maximize2} label="גובה תקרה מקס׳" value={scraped.max_ceiling_height_cm ? `${scraped.max_ceiling_height_cm} ס״מ` : null} />
                      <SpecBadge icon={Sun} label="לומן" value={formatLumens(scraped.lumens)} />
                      <SpecBadge icon={Gauge} label="IP" value={scraped.ip_rating ?? null} />
                    </div>

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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccessoryPage() {
  return (
    <Suspense>
      <AccessoryFormContent />
    </Suspense>
  );
}
