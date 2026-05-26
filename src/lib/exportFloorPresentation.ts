import JSZip from "jszip";
import type { Floor, Project } from "@/types";
import {
  buildAccessorySlideContext,
  buildCoverSlideContext,
  buildItemSlideContext,
  type CatalogSlideContext,
  type CoverSlideContext,
} from "@/lib/catalogSlideFill";
import { loadCatalogTemplateBuffer } from "@/lib/loadCatalogTemplate";
import {
  applyTemplateVariables,
  buildCatalogTemplateVars,
  buildCoverTemplateVars,
  escapeXmlText,
  patchMountingInstructionsLink,
  readProductUrlFromSlide,
} from "@/lib/catalogTemplateVariables";

const PRODUCT_URL_BOX_X = "1030929";
const PRODUCT_URL_BOX_Y = "17650000";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/'/g, "&apos;");
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const entry = zip.file(path);
  if (!entry) {
    throw new Error(
      `תבנית המצגת לא תקינה — חסר הקובץ ${path}. עדכן את catalog-template.pptx (הרץ patch-template-vars + pack-catalog-template).`
    );
  }
  return entry.async("string");
}

function extractShapeXml(
  xml: string,
  shapeName: string
): { start: number; end: number; shape: string } | null {
  const marker = `name="${shapeName}"`;
  const nameIdx = xml.indexOf(marker);
  if (nameIdx === -1) return null;
  const start = xml.lastIndexOf("<p:sp>", nameIdx);
  const end = xml.indexOf("</p:sp>", nameIdx) + 7;
  if (start === -1 || end <= start) return null;
  return { start, end, shape: xml.slice(start, end) };
}

function patchProductUrlTextbox(xml: string): string {
  const placeholderIdx = xml.indexOf("{{productUrl}}");
  const block =
    placeholderIdx !== -1
      ? (() => {
          const start = xml.lastIndexOf("<p:sp>", placeholderIdx);
          const end = xml.indexOf("</p:sp>", placeholderIdx) + 7;
          if (start === -1 || end <= start) return null;
          return { start, end, shape: xml.slice(start, end) };
        })()
      : extractShapeXml(xml, "TextBox 13");
  if (!block) return xml;

  let { shape } = block;
  if (shape.includes("TextBox 13") || shape.includes('name="TextBox 13"')) {
    shape = shape.replace(
      /<a:off x="\d+" y="-?\d+"/,
      `<a:off x="${PRODUCT_URL_BOX_X}" y="${PRODUCT_URL_BOX_Y}"`
    );
  }

  const urlMatch = shape.match(/<a:t>(https?:\/\/[^<]+)<\/a:t>/);
  if (urlMatch && shape.includes("hlinkClick")) {
    shape = shape.replace(/tooltip="[^"]+"/, `tooltip="${escapeXmlAttr(urlMatch[1])}"`);
  }

  return xml.slice(0, block.start) + shape + xml.slice(block.end);
}

function applyCatalogSlideXml(templateXml: string, ctx: CatalogSlideContext): string {
  const vars = buildCatalogTemplateVars(ctx);
  let xml = applyTemplateVariables(templateXml, vars);
  xml = patchProductUrlTextbox(xml);
  // תבנית Google: קישור התקנה ב-{{mountingInstructionsUrl}} + rId6 — רק מעדכנים rels
  if (!templateXml.includes("{{mountingInstructionsUrl}}")) {
    xml = patchMountingInstructionsLink(
      xml,
      vars.mountingInstructionsUrl,
      vars.mountingInstructionsLabel
    );
  }
  return xml;
}

function applyCoverSlideXml(templateXml: string, ctx: CoverSlideContext): string {
  return applyTemplateVariables(templateXml, buildCoverTemplateVars(ctx));
}

function updateSlideRels(
  rels: string,
  opts: { productUrl?: string; mountingUrl?: string; mediaFile?: string | null }
): string {
  let out = rels;
  if (opts.productUrl?.trim()) {
    out = out.replace(
      /(<Relationship Id="rId5" Type="[^"]*hyperlink"[^>]*Target=")[^"]+(")/,
      `$1${escapeXmlAttr(opts.productUrl.trim())}$2`
    );
  }
  if (opts.mountingUrl?.trim()) {
    const target = escapeXmlAttr(opts.mountingUrl.trim());
    const rel = `<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${target}" TargetMode="External"/>`;
    if (out.includes('Id="rId6"')) {
      out = out.replace(/<Relationship Id="rId6"[^/]*\/>/, rel);
    } else {
      out = out.replace("</Relationships>", `${rel}</Relationships>`);
    }
  }
  if (opts.mediaFile) {
    out = out.replace(
      /Target="\.\.\/media\/image1\.(png|jpe?g)"/i,
      `Target="../media/${opts.mediaFile}"`
    );
  }
  return out;
}

async function fetchImageBytes(url: string): Promise<{ data: Uint8Array; ext: string } | null> {
  try {
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    const ext = ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : "png";
    return { data: new Uint8Array(await res.arrayBuffer()), ext };
  } catch {
    return null;
  }
}

const SLIDE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

function collectUsedRIds(relsXml: string): Set<number> {
  const used = new Set<number>();
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) {
    used.add(parseInt(m[1], 10));
  }
  return used;
}

/** מעדכן רק קשרי שקופיות — שומר theme/master/metadata של Google/Office */
function patchPresentationRels(
  baseRels: string,
  slideCount: number
): { rels: string; slideRIds: string[] } {
  const withoutSlides = baseRels.replace(
    /<Relationship Id="rId\d+" Type="[^"]*relationships\/slide" Target="slides\/slide\d+\.xml"[^/]*\/>/g,
    ""
  );
  const used = collectUsedRIds(withoutSlides);
  const slideRIds: string[] = [];
  const newSlideRels: string[] = [];
  let candidate = 1;

  for (let i = 0; i < slideCount; i++) {
    while (used.has(candidate)) candidate += 1;
    const rid = `rId${candidate}`;
    used.add(candidate);
    slideRIds.push(rid);
    newSlideRels.push(
      `<Relationship Id="${rid}" Type="${SLIDE_REL_TYPE}" Target="slides/slide${i + 1}.xml"/>`
    );
    candidate += 1;
  }

  const rels = withoutSlides.replace(
    "</Relationships>",
    `${newSlideRels.join("")}</Relationships>`
  );
  return { rels, slideRIds };
}

function patchPresentationXml(basePres: string, slideRIds: string[]): string {
  const sldIds = slideRIds
    .map((rId, i) => `<p:sldId id="${256 + i}" r:id="${rId}"/>`)
    .join("");
  if (basePres.includes("<p:sldIdLst>")) {
    return basePres.replace(
      /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
      `<p:sldIdLst>${sldIds}</p:sldIdLst>`
    );
  }
  return basePres.replace(
    "</p:presentation>",
    `<p:sldIdLst>${sldIds}</p:sldIdLst></p:presentation>`
  );
}

function mediaContentType(filename: string): string {
  return filename.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
}

function patchContentTypes(
  ct: string,
  slideCount: number,
  mediaFiles: string[]
): string {
  let out = ct.replace(
    /<Override PartName="\/ppt\/slides\/slide2\.xml"[^/]*\/>/g,
    ""
  );

  if (!out.includes('Extension="jpeg"')) {
    out = out.replace(
      "</Types>",
      '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'
    );
  }

  for (let i = 1; i <= slideCount; i++) {
    const part = `/ppt/slides/slide${i}.xml`;
    if (!out.includes(part)) {
      out = out.replace(
        "</Types>",
        `<Override PartName="${part}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
      );
    }
  }

  for (const file of mediaFiles) {
    const part = `/ppt/media/${file}`;
    if (!out.includes(part)) {
      out = out.replace(
        "</Types>",
        `<Override PartName="${part}" ContentType="${mediaContentType(file)}"/></Types>`
      );
    }
  }

  return out;
}

export interface SlideEntry {
  ctx: CatalogSlideContext;
}

function collectSlideEntries(project: Project, floor: Floor): SlideEntry[] {
  const entries: SlideEntry[] = [];
  for (const item of floor.items) {
    entries.push({ ctx: buildItemSlideContext(project, floor, item) });
    item.accessories.forEach((acc, idx) => {
      entries.push({ ctx: buildAccessorySlideContext(project, floor, item, acc, idx) });
    });
  }
  return entries;
}

export async function exportFloorToPresentation(
  project: Project,
  floor: Floor
): Promise<void> {
  const templateBuf = await loadCatalogTemplateBuffer();
  const zip = await JSZip.loadAsync(templateBuf);

  const coverTemplate = await readZipText(zip, "ppt/slides/slide1.xml");
  const catalogTemplate = await readZipText(zip, "ppt/slides/slide2.xml");
  const catalogRelsTemplate = await readZipText(zip, "ppt/slides/_rels/slide2.xml.rels");
  const presTemplate = await readZipText(zip, "ppt/presentation.xml");
  const presRelsTemplate = await readZipText(zip, "ppt/_rels/presentation.xml.rels");
  const contentTypes = await readZipText(zip, "[Content_Types].xml");

  const coverCtx = buildCoverSlideContext(project, floor);
  const entries = collectSlideEntries(project, floor);

  const slideCount = 1 + entries.length;
  zip.remove("ppt/slides/slide2.xml");
  zip.remove("ppt/slides/_rels/slide2.xml.rels");

  zip.file("ppt/slides/slide1.xml", applyCoverSlideXml(coverTemplate, coverCtx));

  const mediaFiles: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const slideNum = i + 2;
    const entry = entries[i];
    const slideXml = applyCatalogSlideXml(catalogTemplate, entry.ctx);
    const effectiveProductUrl =
      entry.ctx.productUrl.trim() || readProductUrlFromSlide(slideXml);
    let slideRels = catalogRelsTemplate;

    let mediaFile: string | null = null;
    if (entry.ctx.imageUrl) {
      const img = await fetchImageBytes(entry.ctx.imageUrl);
      if (img) {
        mediaFile = `catalog-${slideNum}.${img.ext}`;
        zip.file(`ppt/media/${mediaFile}`, img.data);
        mediaFiles.push(mediaFile);
      }
    }

    slideRels = updateSlideRels(slideRels, {
      productUrl: effectiveProductUrl,
      mountingUrl: entry.ctx.mountingUrl.trim(),
      mediaFile,
    });
    zip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);
    zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, slideRels);
  }

  const { rels: presRels, slideRIds } = patchPresentationRels(presRelsTemplate, slideCount);
  zip.file("ppt/presentation.xml", patchPresentationXml(presTemplate, slideRIds));
  zip.file("ppt/_rels/presentation.xml.rels", presRels);
  zip.file("[Content_Types].xml", patchContentTypes(contentTypes, slideCount, mediaFiles));

  const out = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = `${sanitizeFilename(project.name)}-${sanitizeFilename(floor.name)}-קטלוג.pptx`;
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
