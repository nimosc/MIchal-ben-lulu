/**
 * Generates public/excel-template.xlsx from template-source.xlsx.xlsx.
 *
 * Creates a NEW workbook (avoids ExcelJS shared-formula splice bugs).
 * Copies rows 1-4 with column remapping:
 *   source cols C-N  (3-14)  → template cols C-N  (3-14)  — fixed meta
 *   source col  O   (15)     → template col  O   (15)     — single room placeholder
 *   source cols AE-AL (31-38) → template cols P-W  (16-23) — trailing cols
 *
 * Run once (or whenever the source template changes):
 *   node scripts/create-excel-template.mjs
 */
import ExcelJS from "exceljs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "../template-source.xlsx.xlsx");
const DST = join(__dirname, "../public/excel-template.xlsx");

// Source column positions (1-based)
const SRC_META_START   = 3;   // C
const SRC_META_END     = 14;  // N
const SRC_ROOM_COL     = 15;  // O – first (and only) room col we keep
const SRC_TRAIL_START  = 31;  // AE
const SRC_TRAIL_END    = 38;  // AL  (8 trailing columns)

// Template column positions (1-based)
const TPL_META_START   = 3;   // C
const TPL_META_END     = 14;  // N
const TPL_ROOM_COL     = 15;  // O
const TPL_TRAIL_START  = 16;  // P
const TPL_TRAIL_END    = 23;  // W

const HEADER_ROW = 4;

function cloneStyle(cell) {
  const s = {};
  if (cell.fill   && cell.fill.type)       s.fill      = JSON.parse(JSON.stringify(cell.fill));
  if (cell.font)                            s.font      = JSON.parse(JSON.stringify(cell.font));
  if (cell.border && Object.keys(cell.border).length) s.border = JSON.parse(JSON.stringify(cell.border));
  if (cell.alignment)                      s.alignment = JSON.parse(JSON.stringify(cell.alignment));
  return s;
}

function applyStyle(cell, style) {
  if (style.fill)      cell.fill      = style.fill;
  if (style.font)      cell.font      = style.font;
  if (style.border)    cell.border    = style.border;
  if (style.alignment) cell.alignment = style.alignment;
}

/**
 * Build a source→template column map for a given source row.
 * Returns an array of { srcCol, dstCol } pairs.
 */
function colMap() {
  const pairs = [];
  // Meta
  for (let c = SRC_META_START; c <= SRC_META_END; c++) {
    pairs.push({ src: c, dst: c });
  }
  // Single room col
  pairs.push({ src: SRC_ROOM_COL, dst: TPL_ROOM_COL });
  // Trailing cols
  for (let i = 0; i < SRC_TRAIL_END - SRC_TRAIL_START + 1; i++) {
    pairs.push({ src: SRC_TRAIL_START + i, dst: TPL_TRAIL_START + i });
  }
  return pairs;
}

async function main() {
  const srcWb = new ExcelJS.Workbook();
  await srcWb.xlsx.readFile(SRC);
  const srcWs = srcWb.worksheets[0];

  const dstWb = new ExcelJS.Workbook();
  const dstWs = dstWb.addWorksheet("template", {
    views: [{ rightToLeft: true }],
  });

  const map = colMap();

  // ── Column widths ────────────────────────────────────────────────────────────
  for (const { src, dst } of map) {
    const w = srcWs.getColumn(src).width;
    if (w) dstWs.getColumn(dst).width = w;
  }
  // Fix the right-side border on the very last column
  const lastTplCol = TPL_TRAIL_END;

  // ── Rows 1–5 (row 5 = style-only data row template, no values) ──────────────
  for (let r = 1; r <= HEADER_ROW + 1; r++) {
    const srcRow = srcWs.getRow(r);
    const dstRow = dstWs.getRow(r);
    dstRow.height = srcRow.height;
    if (srcRow.hidden) dstRow.hidden = true;

    for (const { src, dst } of map) {
      const srcCell = srcRow.getCell(src);
      const dstCell = dstRow.getCell(dst);

      if (r === 3) {
        dstCell.value = ""; // title set dynamically at export time
      } else if (r === HEADER_ROW && src === SRC_ROOM_COL) {
        dstCell.value = "חדר"; // generic placeholder
      } else if (r > HEADER_ROW) {
        dstCell.value = ""; // data row: style only, no values
      } else {
        const v = srcCell.value;
        if (v !== null && v !== undefined) {
          dstCell.value = typeof v === "object" && v?.formula ? "" : v;
        }
      }

      applyStyle(dstCell, cloneStyle(srcCell));
    }

    // Fix left/right outer borders for row 4 and data row 5
    if (r === HEADER_ROW || r === HEADER_ROW + 1) {
      // Medium left border on first meta col
      const firstCell = dstRow.getCell(TPL_META_START);
      const fb = JSON.parse(JSON.stringify(firstCell.border || {}));
      fb.left = { style: "medium", color: { argb: "FF000000" } };
      firstCell.border = fb;

      // Medium right border on last trailing col
      const lastCell = dstRow.getCell(lastTplCol);
      const lb = JSON.parse(JSON.stringify(lastCell.border || {}));
      lb.right = { style: "medium", color: { argb: "FF000000" } };
      lastCell.border = lb;
    }
  }

  // ── Title row merge (C3:W3) ──────────────────────────────────────────────────
  const mergeEnd = `${colLetter(lastTplCol)}3`;
  dstWs.mergeCells(`C3:${mergeEnd}`);

  await dstWb.xlsx.writeFile(DST);
  console.log("Template saved →", DST);

  // ── Verification ─────────────────────────────────────────────────────────────
  const vWb = new ExcelJS.Workbook();
  await vWb.xlsx.readFile(DST);
  const vWs = vWb.worksheets[0];
  console.log(`Verification: ${vWs.rowCount} rows, ${vWs.columnCount} cols`);
  console.log("Merges:", vWs.model.merges);
  console.log("Row 4 headers:");
  vWs.getRow(4).eachCell({ includeEmpty: false }, (cell) => {
    const fill = cell.fill?.fgColor?.argb ?? "none";
    console.log(`  ${cell.address}: "${cell.value}"  fill:${fill}`);
  });
}

function colLetter(col) {
  let n = col, s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

main().catch(console.error);
