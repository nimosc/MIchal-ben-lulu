import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const xml = fs.readFileSync(
  path.join(root, "_template_vptx_v2/ppt/slides/slide2.xml"),
  "utf8"
);

for (const name of ["TextBox 13", "TextBox 39", "TextBox 40", "TextBox 30"]) {
  const i = xml.indexOf(`name="${name}"`);
  const spStart = xml.lastIndexOf("<p:sp>", i);
  const spEnd = xml.indexOf("</p:sp>", i) + 7;
  const chunk = xml.slice(spStart, spEnd);
  const off = chunk.match(/<a:off x="(\d+)" y="(-?\d+)"/);
  const ext = chunk.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
  const text = [...chunk.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  const hlink = chunk.includes("hlinkClick");
  console.log({ name, off: off?.slice(1), ext: ext?.slice(1), hlink, text });
}
