import ExcelJS from "exceljs";
import {
  Accessory,
  Floor,
  LightingItem,
  Project,
  Room,
  ScrapedData,
} from "@/types";

const META_HEADERS = [
  "סעיף",
  "סימון",
  "המחשה",
  "תאור הגוף",
  "גוון גמר",
  "לגובה תקרה",
  "כדוגמאת",
  "יצרן",
  "הערות אדריכלית לפני אישור ליועץ תאורה",
  "מיקום ציוד עזר",
  "מתח/ זרם",
  "מרחק מקסימלי של דרייבר מגוף תאורה",
  "שיטת שליטה",
] as const;

const COL_OFFSET = 1;
const META_COL_COUNT = META_HEADERS.length;
const FIRST_META_COL = COL_OFFSET + 1;
const FIRST_ROOM_COL = FIRST_META_COL + META_COL_COUNT;

function colLetter(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

function uniqueSheetName(wb: ExcelJS.Workbook, baseName: string): string {
  const invalid = /[\\/*?:[\]]/g;
  const name = (baseName.replace(invalid, "-").trim() || "קומה").slice(0, 31);
  if (!wb.getWorksheet(name)) return name;
  let n = 2;
  while (n < 100) {
    const suffix = ` (${n})`;
    const candidate = baseName.replace(invalid, "-").trim().slice(0, 31 - suffix.length) + suffix;
    if (!wb.getWorksheet(candidate)) return candidate;
    n++;
  }
  return `קומה ${n}`.slice(0, 31);
}

function bodyText(scraped: ScrapedData | null, bodyDescription: string): string {
  return scraped?.product_description?.trim() || bodyDescription || "";
}

function finishColor(scraped: ScrapedData | null): string {
  return scraped?.finish_color?.trim() || "";
}

function ceilingHeight(scraped: ScrapedData | null): string | number {
  if (!scraped?.max_ceiling_height_cm) return "";
  const m = scraped.max_ceiling_height_cm / 100;
  return Number.isInteger(m) ? m : Math.round(m * 100) / 100;
}

function qtyByRoom(
  rooms: { room_id: string; qty: number }[],
  roomId: string
): number | "" {
  const entry = rooms.find((r) => r.room_id === roomId);
  return entry && entry.qty > 0 ? entry.qty : "";
}

interface RowContext {
  sectionId?: number;
  mark: string;
  scraped: ScrapedData | null;
  productUrl: string;
  bodyDescription: string;
  driverLocation: string;
  dimmingMethod: string;
  unitType: string;
  rooms: { room_id: string; qty: number }[];
}

function writeDataRow(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  ctx: RowContext,
  sortedRooms: Room[],
  totalCol: number
) {
  const row = ws.getRow(rowNum);
  row.getCell(FIRST_META_COL).value = ctx.sectionId ?? "";
  row.getCell(FIRST_META_COL + 1).value = ctx.mark;
  row.getCell(FIRST_META_COL + 2).value = "";
  row.getCell(FIRST_META_COL + 3).value = bodyText(ctx.scraped, ctx.bodyDescription);
  row.getCell(FIRST_META_COL + 4).value = finishColor(ctx.scraped);
  row.getCell(FIRST_META_COL + 5).value = ceilingHeight(ctx.scraped);
  row.getCell(FIRST_META_COL + 6).value = ctx.productUrl || "";
  row.getCell(FIRST_META_COL + 7).value = ctx.scraped?.manufacturer ?? "";
  row.getCell(FIRST_META_COL + 8).value = "";
  row.getCell(FIRST_META_COL + 9).value = ctx.driverLocation || "";
  row.getCell(FIRST_META_COL + 10).value = ctx.scraped?.voltage ?? "";
  row.getCell(FIRST_META_COL + 11).value = "";
  row.getCell(FIRST_META_COL + 12).value = ctx.dimmingMethod || "";

  sortedRooms.forEach((room, i) => {
    row.getCell(FIRST_ROOM_COL + i).value = qtyByRoom(ctx.rooms, room.id);
  });

  const first = colLetter(FIRST_ROOM_COL);
  const last = colLetter(FIRST_ROOM_COL + sortedRooms.length - 1);
  if (sortedRooms.length > 0) {
    row.getCell(totalCol).value = {
      formula: `SUM(${first}${rowNum}:${last}${rowNum})`,
    };
  } else {
    row.getCell(totalCol).value = 0;
  }
  row.getCell(totalCol + 1).value = ctx.unitType;
}

function itemToContext(item: LightingItem): RowContext {
  return {
    sectionId: item.section_id,
    mark: item.mark,
    scraped: item.scraped,
    productUrl: item.product_url,
    bodyDescription: item.body_description,
    driverLocation: item.driver_location,
    dimmingMethod: item.dimming_method,
    unitType: item.unit_type,
    rooms: item.rooms,
  };
}

function accessoryToContext(
  acc: Accessory,
  parent: LightingItem,
  mark: string
): RowContext {
  return {
    mark,
    scraped: acc.scraped,
    productUrl: acc.product_url,
    bodyDescription: acc.body_description,
    driverLocation: parent.driver_location,
    dimmingMethod: parent.dimming_method,
    unitType: acc.unit_type,
    rooms: acc.rooms,
  };
}

function applyColumnWidths(ws: ExcelJS.Worksheet, totalCol: number) {
  ws.getColumn(1).width = 4;
  ws.columns.forEach((col, i) => {
    const colNum = i + 1;
    if (colNum === FIRST_META_COL + 2) col.width = 14;
    else if (colNum === FIRST_META_COL + 3) col.width = 48;
    else if (colNum >= FIRST_ROOM_COL && colNum < totalCol) col.width = 12;
    else if (colNum >= FIRST_META_COL) col.width = 16;
  });
}

function addFloorSheet(wb: ExcelJS.Workbook, project: Project, floor: Floor): void {
  const sortedRooms = [...floor.rooms].sort((a, b) => a.order - b.order);
  const totalCol = FIRST_ROOM_COL + sortedRooms.length;
  const unitCol = totalCol + 1;
  const sheetName = uniqueSheetName(wb, floor.name);

  const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });

  ws.getCell(3, FIRST_META_COL).value =
    `${project.name} כמויות תאורה פנים- ${floor.name}`;
  ws.getCell(3, FIRST_META_COL).font = { bold: true, size: 12 };

  const headerRow = ws.getRow(4);
  META_HEADERS.forEach((h, i) => {
    headerRow.getCell(FIRST_META_COL + i).value = h;
  });
  sortedRooms.forEach((room, i) => {
    headerRow.getCell(FIRST_ROOM_COL + i).value = room.name;
  });
  headerRow.getCell(totalCol).value = 'סה"כ יחידות';
  headerRow.getCell(unitCol).value = "יח'/ מטר";
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  let rowNum = 5;
  for (const item of floor.items) {
    writeDataRow(ws, rowNum, itemToContext(item), sortedRooms, totalCol);
    rowNum++;
    (item.accessories ?? []).forEach((acc, idx) => {
      writeDataRow(
        ws,
        rowNum,
        accessoryToContext(acc, item, `${item.mark}.${idx + 1}`),
        sortedRooms,
        totalCol
      );
      rowNum++;
    });
  }

  applyColumnWidths(ws, totalCol);
}

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

export async function exportFloorToExcel(
  project: Project,
  floor: Floor
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "lighting-app";
  addFloorSheet(wb, project, floor);
  const filename = `${sanitizeFilename(project.name)}-${sanitizeFilename(floor.name)}-כמויות-תאורה.xlsx`;
  await downloadWorkbook(wb, filename);
}

export async function exportProjectToExcel(project: Project): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "lighting-app";
  const floors = [...project.floors].sort((a, b) => a.order - b.order);
  for (const floor of floors) {
    addFloorSheet(wb, project, floor);
  }
  if (floors.length === 0) {
    const ws = wb.addWorksheet("פרויקט", { views: [{ rightToLeft: true }] });
    ws.getCell(3, FIRST_META_COL).value = `${project.name} — אין קומות`;
  }
  const filename = `${sanitizeFilename(project.name)}-כמויות-תאורה.xlsx`;
  await downloadWorkbook(wb, filename);
}
