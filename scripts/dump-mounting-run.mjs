import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const xml = fs.readFileSync(
  path.join(root, "..", "_template_vptx_v2/ppt/slides/slide2.xml"),
  "utf8"
);
const label = "קישור לדף הוראות התקנת גוף תאורה";
const idx = xml.indexOf(label);
console.log(xml.slice(idx - 400, idx + label.length + 80));
