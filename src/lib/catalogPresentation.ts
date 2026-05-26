import type { Floor, ItemRoom } from "@/types";

/** טקסט הערות תחתון קבוע בדף קטלוג — כמו בתבנית המצגת */
export const CATALOG_FOOTER_NOTES = [
  "דרייבר יסופק ע\"י ספק גופי תאורה לאחר תיאום מול יועץ בקרה חכם",
  "גופי תאורה לעמעום חייבים לעבור אישור יועץ בקר חכם שהגוף תאורה ניתן לעמעום של עד 1%",
] as const;

export const CATALOG_FOOTER_NOTES_TEXT = CATALOG_FOOTER_NOTES.join("\n");

/** שמות חדרים לדף קטלוג: כל חדר עם כמות > 0, מופרדים בפסיק */
export function formatCatalogRoomNames(
  floor: Floor,
  itemRooms: ItemRoom[]
): string {
  const byId = new Map(floor.rooms.map((r) => [r.id, r]));
  const names = itemRooms
    .filter((ir) => ir.qty > 0)
    .map((ir) => byId.get(ir.room_id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => a.order - b.order)
    .map((r) => r.name);

  return names.join(", ");
}
