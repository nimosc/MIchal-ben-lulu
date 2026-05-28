import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const buf = fs.readFileSync(path.join(appRoot, "public/catalog-template.pptx"));
const zip = await JSZip.loadAsync(buf);

const rels = await zip.file("ppt/slides/_rels/slide2.xml.rels").async("string");
console.log("slide2 rels:\n", rels);

const slide = await zip.file("ppt/slides/slide2.xml").async("string");
const embeds = [...slide.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1]);
console.log("embed rIds:", embeds);

const media = Object.keys(zip.files).filter((f) => f.startsWith("ppt/media/"));
console.log("media files:", media);

const notes = Object.keys(zip.files).filter((f) => f.includes("notesSlide"));
console.log("notes:", notes);

const ct = await zip.file("[Content_Types].xml").async("string");
console.log("CT slide overrides:", [...ct.matchAll(/slides\/slide\d/g)].map((m) => m[0]));
