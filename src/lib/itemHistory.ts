import { LightingItem, SavedLightingTemplate } from "@/types";

export const MAX_ITEM_HISTORY = 80;

export function getTemplateLabel(t: SavedLightingTemplate): string {
  return (
    t.scraped?.product_name?.trim() ||
    t.body_description?.trim() ||
    t.product_url?.trim() ||
    "גוף ללא שם"
  );
}

export function getTemplateSubtitle(t: SavedLightingTemplate): string {
  const parts = [
    t.scraped?.manufacturer,
    t.scraped?.model,
  ].filter(Boolean);
  return parts.join(" · ") || "";
}

/** Flat text used for search matching. */
export function templateSearchText(t: SavedLightingTemplate): string {
  const s = t.scraped;
  return [
    getTemplateLabel(t),
    getTemplateSubtitle(t),
    t.body_description,
    t.product_url,
    t.driver_location,
    t.dimming_method,
    t.unit_type,
    s?.voltage,
    s?.current,
    s?.product_description,
    s?.color_temp_k != null ? `${s.color_temp_k}K` : "",
    s?.watt_per_unit != null ? `${s.watt_per_unit}W` : "",
    s?.cri != null ? `CRI ${s.cri}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterItemHistory(
  history: SavedLightingTemplate[],
  query: string
): SavedLightingTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return history;
  return history.filter((t) => templateSearchText(t).includes(q));
}

export function formatTemplateSavedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return "היום";
    if (days === 1) return "אתמול";
    if (days < 7) return `לפני ${days} ימים`;
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function templateMatchKey(
  t: Pick<SavedLightingTemplate, "product_url" | "scraped" | "body_description">
): string {
  const url = t.product_url?.trim().toLowerCase();
  if (url) return `url:${url}`;
  const name = t.scraped?.product_name?.trim() || t.body_description?.trim() || "";
  const mfr = t.scraped?.manufacturer?.trim() || "";
  return `desc:${name}|${mfr}`;
}

export function lightingItemToTemplate(
  item: Pick<
    LightingItem,
    | "product_url"
    | "driver_location"
    | "dimming_method"
    | "body_description"
    | "unit_type"
    | "price_per_unit"
    | "scraped"
  >
): Omit<SavedLightingTemplate, "id" | "saved_at"> {
  return {
    product_url: item.product_url,
    driver_location: item.driver_location,
    dimming_method: item.dimming_method,
    body_description: item.body_description,
    unit_type: item.unit_type,
    price_per_unit: item.price_per_unit,
    scraped: item.scraped,
  };
}

export function upsertItemHistory(
  history: SavedLightingTemplate[],
  data: Omit<SavedLightingTemplate, "id" | "saved_at">
): SavedLightingTemplate[] {
  const key = templateMatchKey(data);
  const now = new Date().toISOString();
  const existing = history.find((h) => templateMatchKey(h) === key);
  const entry: SavedLightingTemplate = existing
    ? { ...existing, ...data, saved_at: now }
    : { ...data, id: crypto.randomUUID(), saved_at: now };

  const rest = history.filter((h) => h.id !== entry.id);
  return [entry, ...rest].slice(0, MAX_ITEM_HISTORY);
}
