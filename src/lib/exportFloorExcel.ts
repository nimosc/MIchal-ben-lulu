import ExcelJS from "exceljs";
import { Floor, Accessory, Project, ScrapedData } from "@/types";

// ── Template column layout (1-based) ────────────────────────────────────────
// C-N  (3-14 ) : fixed meta   (12 cols)
// O    (15)    : single room placeholder
// P-W  (16-23) : fixed trailing (8 cols) – total, unit, notes, price, total-price, delivery, watt, total-watt
const META_FIRST     = 3;   // C
const META_LAST      = 14;  // N
const TPL_ROOM_COL   = 15;  // O
const TPL_TRAIL_FIRST = 16; // P  — offset 0 = total
// Trailing col offsets from TPL_TRAIL_FIRST:
const T_TOTAL    = 0; // סה"כ יחידות  (yellow)
const T_UNIT     = 1; // יח'/מטר      (gray)
const T_NOTES    = 2; // הערות        (gray)
const T_PRICE    = 3; // מחיר ליח'    (none)
const T_TPRICE   = 4; // סה"כ מחיר   (none)
const T_DELIVERY = 5; // זמני אספקה  (none)
const T_WATT     = 6; // WATT         (yellow)
const T_TWATT    = 7; // סה"כ WATT   (yellow)
const TRAIL_COUNT = 8;

// Output rows
const TITLE_ROW  = 3;
const HEADER_ROW = 4;
const DATA_START = 5;

type CellStyle = {
  fill?:      ExcelJS.Fill;
  font?:      ExcelJS.Font;
  border?:    ExcelJS.Borders;
  alignment?: ExcelJS.Alignment;
};

function readStyle(cell: ExcelJS.Cell): CellStyle {
  const s: CellStyle = {};
  if (cell.fill   && (cell.fill as ExcelJS.FillPattern).type)       s.fill      = JSON.parse(JSON.stringify(cell.fill));
  if (cell.font)                            s.font      = JSON.parse(JSON.stringify(cell.font));
  if (cell.border && Object.keys(cell.border).length) s.border = JSON.parse(JSON.stringify(cell.border));
  if (cell.alignment)                       s.alignment = JSON.parse(JSON.stringify(cell.alignment));
  return s;
}

function applyStyle(cell: ExcelJS.Cell, s: CellStyle) {
  if (s.fill)      cell.fill      = s.fill as ExcelJS.Fill;
  if (s.font)      cell.font      = s.font;
  if (s.border)    cell.border    = s.border;
  if (s.alignment) cell.alignment = s.alignment as ExcelJS.Alignment;
}

/** Styles extracted from the template (header row + data row) */
interface TemplateStyles {
  header: { meta: CellStyle[]; room: CellStyle; trailing: CellStyle[] };
  data:   { meta: CellStyle[]; room: CellStyle; trailing: CellStyle[] };
  rowHeights: { [r: number]: number | undefined };
  colWidths:  { meta: (number|undefined)[]; room: number|undefined; trailing: (number|undefined)[] };
}

let _templateCache: TemplateStyles | null = null;

async function loadTemplateStyles(): Promise<TemplateStyles> {
  if (_templateCache) return _templateCache;

  const res = await fetch("/excel-template.xlsx");
  const buf = await res.arrayBuffer();
  const wb  = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  function rowStyles(r: number) {
    const row = ws.getRow(r);
    const meta: CellStyle[] = [];
    for (let c = META_FIRST; c <= META_LAST; c++) meta.push(readStyle(row.getCell(c)));
    const room = readStyle(row.getCell(TPL_ROOM_COL));
    const trailing: CellStyle[] = [];
    for (let i = 0; i < TRAIL_COUNT; i++) trailing.push(readStyle(row.getCell(TPL_TRAIL_FIRST + i)));
    return { meta, room, trailing };
  }

  _templateCache = {
    header: rowStyles(HEADER_ROW),
    data:   rowStyles(DATA_START),
    rowHeights: {
      [HEADER_ROW]: ws.getRow(HEADER_ROW).height,
      [DATA_START]: ws.getRow(DATA_START).height,
    },
    colWidths: {
      meta:     Array.from({ length: META_LAST - META_FIRST + 1 }, (_, i) =>
                  ws.getColumn(META_FIRST + i).width),
      room:     ws.getColumn(TPL_ROOM_COL).width,
      trailing: Array.from({ length: TRAIL_COUNT }, (_, i) =>
                  ws.getColumn(TPL_TRAIL_FIRST + i).width),
    },
  };
  return _templateCache;
}

// ── Cell value helpers ──────────────────────────────────────────────────────

function bodyText(scraped: ScrapedData | null, fallback: string): string {
  return scraped?.product_description?.trim() || fallback || "";
}

function ceilingHeight(scraped: ScrapedData | null): string | number {
  if (!scraped?.max_ceiling_height_cm) return "";
  const m = scraped.max_ceiling_height_cm / 100;
  return Number.isInteger(m) ? m : Math.round(m * 100) / 100;
}

function roomQty(rooms: { room_id: string; qty: number }[], roomId: string): number | "" {
  const e = rooms.find((r) => r.room_id === roomId);
  return e && e.qty > 0 ? e.qty : "";
}

function colLetter(col: number): string {
  let n = col, s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

function uniqueSheetName(wb: ExcelJS.Workbook, baseName: string): string {
  const inv = /[\\/*?:[\]]/g;
  const clean = (baseName.replace(inv, "-").trim() || "קומה").slice(0, 31);
  if (!wb.getWorksheet(clean)) return clean;
  for (let n = 2; n < 100; n++) {
    const s = ` (${n})`;
    const c = baseName.replace(inv, "-").trim().slice(0, 31 - s.length) + s;
    if (!wb.getWorksheet(c)) return c;
  }
  return `קומה`.slice(0, 31);
}

// ── Sheet builder ───────────────────────────────────────────────────────────

async function addFloorSheet(
  wb: ExcelJS.Workbook,
  project: Project,
  floor: Floor,
  tpl: TemplateStyles
): Promise<void> {
  const sortedRooms = [...floor.rooms].sort((a, b) => a.order - b.order);
  const N = sortedRooms.length;

  // Dynamic column positions (1-based)
  const ROOM_FIRST  = META_LAST + 1;           // 15 = O
  const TRAIL_FIRST = ROOM_FIRST + N;           // after rooms
  const LAST_COL    = TRAIL_FIRST + TRAIL_COUNT - 1;

  const totalCol    = TRAIL_FIRST + T_TOTAL;
  const unitCol     = TRAIL_FIRST + T_UNIT;
  const notesCol    = TRAIL_FIRST + T_NOTES;
  const priceCol    = TRAIL_FIRST + T_PRICE;
  const tPriceCol   = TRAIL_FIRST + T_TPRICE;
  const deliveryCol = TRAIL_FIRST + T_DELIVERY;
  const wattCol     = TRAIL_FIRST + T_WATT;
  const tWattCol    = TRAIL_FIRST + T_TWATT;

  const sheetName = uniqueSheetName(wb, floor.name);
  const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });

  // ── Column widths ──────────────────────────────────────────────────────────
  for (let i = 0; i < META_LAST - META_FIRST + 1; i++) {
    if (tpl.colWidths.meta[i]) ws.getColumn(META_FIRST + i).width = tpl.colWidths.meta[i]!;
  }
  for (let r = 0; r < N; r++) {
    if (tpl.colWidths.room) ws.getColumn(ROOM_FIRST + r).width = tpl.colWidths.room;
  }
  for (let i = 0; i < TRAIL_COUNT; i++) {
    if (tpl.colWidths.trailing[i]) ws.getColumn(TRAIL_FIRST + i).width = tpl.colWidths.trailing[i]!;
  }

  // ── Title row (row 3) ──────────────────────────────────────────────────────
  ws.mergeCells(`${colLetter(META_FIRST)}${TITLE_ROW}:${colLetter(LAST_COL)}${TITLE_ROW}`);
  const titleCell = ws.getCell(TITLE_ROW, META_FIRST);
  titleCell.value = `${project.name} כמויות תאורה פנים- ${floor.name}`;
  titleCell.font  = { bold: true, size: 18, name: "Arial" };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  // ── Header row (row 4) ─────────────────────────────────────────────────────
  const hRow = ws.getRow(HEADER_ROW);
  if (tpl.rowHeights[HEADER_ROW]) hRow.height = tpl.rowHeights[HEADER_ROW]!;

  // Meta headers
  for (let i = 0; i < tpl.header.meta.length; i++) {
    const cell = hRow.getCell(META_FIRST + i);
    cell.value = ws.getRow(HEADER_ROW).getCell(META_FIRST + i).value; // will be set below
    applyStyle(cell, tpl.header.meta[i]);
  }

  // Set actual meta header values
  const metaHeaders = [
    "סעיף", "סימון", "תאור הגוף", "גוון גמר", "לגובה תקרה",
    "כדוגמאת", "יצרן",
    "הערות אדריכלית לפני אישור ליועץ תאורה",
    "מיקום ציוד (מרוחק/ אינטגרלי/ מקומי)",
    "מתח/ זרם", "מרחק מקסימלי של דרייבר מגוף תאורה", "שיטת עמעום",
  ];
  metaHeaders.forEach((h, i) => {
    hRow.getCell(META_FIRST + i).value = h;
  });

  // Room headers
  sortedRooms.forEach((room, i) => {
    const cell = hRow.getCell(ROOM_FIRST + i);
    cell.value = room.name;
    applyStyle(cell, tpl.header.room);
  });

  // Trailing headers
  const trailingHeaders = [
    'סה"כ יחידות', "יח' / מטר", "הערות",
    'מחיר ליח\' לפני מע"מ', 'סה"כ לפני מע"מ', "זמני אספקה",
    "WATT ליחי' /מטר System Power (W)", "סה\"כ WATT Total Power (W)",
  ];
  trailingHeaders.forEach((h, i) => {
    const cell = hRow.getCell(TRAIL_FIRST + i);
    cell.value = h;
    applyStyle(cell, tpl.header.trailing[i]);
  });

  // Fix outer borders: medium-left on first col, medium-right on last col
  const fixBorder = (col: number, side: "left" | "right") => {
    const cell = hRow.getCell(col);
    const b = JSON.parse(JSON.stringify(cell.border || {}));
    b[side] = { style: "medium", color: { argb: "FF000000" } };
    cell.border = b;
  };
  fixBorder(META_FIRST, "left");
  fixBorder(LAST_COL, "right");

  // ── Data rows ──────────────────────────────────────────────────────────────
  let rowNum = DATA_START;

  const writeRow = (ctx: {
    sectionId?: number;
    mark: string;
    scraped: ScrapedData | null;
    productUrl: string;
    bodyDescription: string;
    driverLocation: string;
    dimmingMethod: string;
    unitType: string;
    pricePerUnit: number;
    rooms: { room_id: string; qty: number }[];
  }) => {
    const row = ws.getRow(rowNum);
    if (tpl.rowHeights[DATA_START]) row.height = tpl.rowHeights[DATA_START];

    const setMeta = (offset: number, val: ExcelJS.CellValue, styleIdx: number) => {
      const cell = row.getCell(META_FIRST + offset);
      cell.value = val;
      applyStyle(cell, tpl.data.meta[styleIdx]);
    };

    setMeta(0, ctx.sectionId ?? "", 0);           // C: סעיף
    setMeta(1, ctx.mark, 1);                       // D: סימון
    setMeta(2, bodyText(ctx.scraped, ctx.bodyDescription), 2); // E: תאור הגוף
    setMeta(3, ctx.scraped?.finish_color ?? "", 3); // F: גוון גמר
    setMeta(4, ceilingHeight(ctx.scraped), 4);     // G: לגובה תקרה
    setMeta(5, ctx.productUrl || "", 5);           // H: כדוגמאת
    setMeta(6, ctx.scraped?.manufacturer ?? "", 6);// I: יצרן
    setMeta(7, "", 7);                             // J: הערות אדריכלית
    setMeta(8, ctx.driverLocation || "", 8);       // K: מיקום ציוד
    setMeta(9, ctx.scraped?.voltage ?? "", 9);     // L: מתח/זרם
    setMeta(10, "", 10);                           // M: מרחק מקסימלי
    setMeta(11, ctx.dimmingMethod || "", 11);      // N: שיטת עמעום

    // Room quantities
    sortedRooms.forEach((room, i) => {
      const cell = row.getCell(ROOM_FIRST + i);
      cell.value = roomQty(ctx.rooms, room.id);
      applyStyle(cell, tpl.data.room);
    });

    // Trailing
    const firstRoom = colLetter(ROOM_FIRST);
    const lastRoom  = N > 0 ? colLetter(ROOM_FIRST + N - 1) : firstRoom;

    const total = row.getCell(totalCol);
    total.value = N > 0 ? { formula: `SUM(${firstRoom}${rowNum}:${lastRoom}${rowNum})` } : 0;
    applyStyle(total, tpl.data.trailing[T_TOTAL]);

    const unit = row.getCell(unitCol);
    unit.value = ctx.unitType;
    applyStyle(unit, tpl.data.trailing[T_UNIT]);

    const notes = row.getCell(notesCol);
    notes.value = "";
    applyStyle(notes, tpl.data.trailing[T_NOTES]);

    const price = row.getCell(priceCol);
    price.value = ctx.pricePerUnit > 0 ? ctx.pricePerUnit : "";
    applyStyle(price, tpl.data.trailing[T_PRICE]);

    const tPrice = row.getCell(tPriceCol);
    tPrice.value = ctx.pricePerUnit > 0
      ? { formula: `${colLetter(totalCol)}${rowNum}*${colLetter(priceCol)}${rowNum}` }
      : "";
    applyStyle(tPrice, tpl.data.trailing[T_TPRICE]);

    const delivery = row.getCell(deliveryCol);
    delivery.value = "";
    applyStyle(delivery, tpl.data.trailing[T_DELIVERY]);

    const watt = row.getCell(wattCol);
    watt.value = ctx.scraped?.watt_per_unit ?? "";
    applyStyle(watt, tpl.data.trailing[T_WATT]);

    const tWatt = row.getCell(tWattCol);
    tWatt.value = ctx.scraped?.watt_per_unit
      ? { formula: `${colLetter(wattCol)}${rowNum}*${colLetter(totalCol)}${rowNum}` }
      : "";
    applyStyle(tWatt, tpl.data.trailing[T_TWATT]);

    // Outer borders on data row
    const fixDataBorder = (col: number, side: "left" | "right") => {
      const cell = row.getCell(col);
      const b = JSON.parse(JSON.stringify(cell.border || {}));
      b[side] = { style: "medium", color: { argb: "FF000000" } };
      cell.border = b;
    };
    fixDataBorder(META_FIRST, "left");
    fixDataBorder(LAST_COL,   "right");

    rowNum++;
  };

  for (const item of floor.items) {
    writeRow({
      sectionId:      item.section_id,
      mark:           item.mark,
      scraped:        item.scraped,
      productUrl:     item.product_url,
      bodyDescription: item.body_description,
      driverLocation: item.driver_location,
      dimmingMethod:  item.dimming_method,
      unitType:       item.unit_type,
      pricePerUnit:   item.price_per_unit,
      rooms:          item.rooms,
    });

    (item.accessories ?? []).forEach((acc: Accessory, idx) => {
      writeRow({
        mark:           `${item.mark}.${idx + 1}`,
        scraped:        acc.scraped,
        productUrl:     acc.product_url,
        bodyDescription: acc.body_description,
        driverLocation: item.driver_location,
        dimmingMethod:  item.dimming_method,
        unitType:       acc.unit_type,
        pricePerUnit:   acc.price_per_unit,
        rooms:          acc.rooms,
      });
    });
  }
}

// ── Download helpers ────────────────────────────────────────────────────────

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function exportFloorToExcel(project: Project, floor: Floor): Promise<void> {
  const tpl = await loadTemplateStyles();
  const wb  = new ExcelJS.Workbook();
  wb.creator = "lighting-app";
  await addFloorSheet(wb, project, floor, tpl);
  const filename = `${sanitizeFilename(project.name)}-${sanitizeFilename(floor.name)}-כמויות-תאורה.xlsx`;
  await downloadWorkbook(wb, filename);
}

export async function exportProjectToExcel(project: Project): Promise<void> {
  const tpl = await loadTemplateStyles();
  const wb  = new ExcelJS.Workbook();
  wb.creator = "lighting-app";
  const floors = [...project.floors].sort((a, b) => a.order - b.order);
  for (const floor of floors) {
    await addFloorSheet(wb, project, floor, tpl);
  }
  if (floors.length === 0) {
    wb.addWorksheet("פרויקט", { views: [{ rightToLeft: true }] })
      .getCell(TITLE_ROW, META_FIRST).value = `${project.name} — אין קומות`;
  }
  const filename = `${sanitizeFilename(project.name)}-כמויות-תאורה.xlsx`;
  await downloadWorkbook(wb, filename);
}
