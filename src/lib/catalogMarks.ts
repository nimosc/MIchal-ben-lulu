/** סימוני גוף תאורה — רשימה זמנית לפי PDF ההסבר; תורחב כשתתקבל רשימה סופית */
export const CATALOG_MARKS = [
  "D",
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "DW",
  "DW1",
  "DW2",
  "DW3",
  "DW4",
  "DW5",
  "DT",
  "DT1",
  "DT2",
  "DT3",
  "DT4",
  "DT5",
  "DS",
  "DS1",
  "DS2",
  "DS3",
  "DS4",
  "DS5",
  "DS6",
  "C",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
] as const;

export type CatalogMark = (typeof CATALOG_MARKS)[number];

export const DEFAULT_CATALOG_MARK: CatalogMark = "D";
