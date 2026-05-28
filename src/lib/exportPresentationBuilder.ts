import JSZip from "jszip";
import type { CatalogSlideContext, CoverSlideContext } from "@/lib/catalogSlideFill";
import { loadAllCatalogTemplates } from "@/lib/loadCatalogTemplate";
import {
  applyTemplateVariables,
  buildCatalogTemplateVars,
  buildCoverTemplateVars,
  escapeXmlText,
  patchLinkShapeByAltText,
  patchMountingInstructionsLink,
} from "@/lib/catalogTemplateVariables";
import type { CatalogSlidePlan } from "@/lib/catalogTemplateTypes";
import {
  applySlideMediaFiles,
  fetchCatalogImageBytes,
  mediaContentTypeForFile,
  updateSlideRelsWithMediaFiles,
} from "@/lib/pptxExportUtils";

const PRODUCT_URL_BOX_X = "1030929";
const PRODUCT_URL_BOX_Y = "17650000";

const SLIDE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/'/g, "&apos;");
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const entry = zip.file(path);
  if (!entry) {
    throw new Error(`תבנית לא תקינה — חסר הקובץ ${path}`);
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

export function applyCatalogSlideXml(templateXml: string, ctx: CatalogSlideContext): string {
  const vars = buildCatalogTemplateVars(ctx);
  let xml = applyTemplateVariables(templateXml, vars);
  xml = patchLinkShapeByAltText(xml, {
    relId: "rId5",
    url: ctx.productUrl,
    markers: ["{{קישור_מוצר}}", "קישור_מוצר", "{{productUrl}}", "productUrl"],
  });
  xml = patchLinkShapeByAltText(xml, {
    relId: "rId6",
    url: ctx.mountingUrl,
    markers: [
      "{{קישור_הוראות_התקנה}}",
      "קישור_הוראות_התקנה",
      "{{mountingInstructionsUrl}}",
      "mountingInstructionsUrl",
    ],
  });
  xml = patchProductUrlTextbox(xml);
  if (!templateXml.includes("{{mountingInstructionsUrl}}")) {
    xml = patchMountingInstructionsLink(
      xml,
      ctx.mountingUrl,
      vars["תווית_הוראות_התקנה"]
    );
  }
  return xml;
}

function applyCoverSlideXml(templateXml: string, ctx: CoverSlideContext): string {
  return applyTemplateVariables(templateXml, buildCoverTemplateVars(ctx));
}

function collectUsedRIds(relsXml: string): Set<number> {
  const used = new Set<number>();
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) {
    used.add(parseInt(m[1], 10));
  }
  return used;
}

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

function patchContentTypes(ct: string, slideCount: number, mediaFiles: string[]): string {
  let out = ct.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, "");

  if (!out.includes('Extension="jpeg"')) {
    out = out.replace(
      "</Types>",
      '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'
    );
  }
  if (!out.includes('Extension="webp"')) {
    out = out.replace(
      "</Types>",
      '<Default Extension="webp" ContentType="image/webp"/></Types>'
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
        `<Override PartName="${part}" ContentType="${mediaContentTypeForFile(file)}"/></Types>`
      );
    }
  }

  return out;
}

function removeExtraSlides(zip: JSZip, keepThrough: number): void {
  const paths = Object.keys(zip.files);
  for (const p of paths) {
    const slideMatch = p.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (slideMatch && parseInt(slideMatch[1], 10) > keepThrough) {
      zip.remove(p);
      zip.remove(`ppt/slides/_rels/slide${slideMatch[1]}.xml.rels`);
    }
  }
}

export type CatalogOutputSlide = {
  ctx: CatalogSlideContext;
  plan: CatalogSlidePlan;
};

export type CatalogPresentationResult = {
  blob: Blob;
  /** הודעות על תמונות שלא נטענו (URL) */
  imageWarnings: string[];
};

export async function buildCatalogPresentationBlob(options: {
  coverCtx: CoverSlideContext;
  catalogSlides: CatalogOutputSlide[];
}): Promise<CatalogPresentationResult> {
  const templates = await loadAllCatalogTemplates();
  const coverZip = await JSZip.loadAsync(templates.cover);
  const outZip = coverZip;

  const coverTemplate = await readZipText(outZip, "ppt/slides/slide1.xml");
  const presTemplate = await readZipText(outZip, "ppt/presentation.xml");
  const presRelsTemplate = await readZipText(outZip, "ppt/_rels/presentation.xml.rels");
  const contentTypes = await readZipText(outZip, "[Content_Types].xml");

  removeExtraSlides(outZip, 1);
  outZip.file("ppt/slides/slide1.xml", applyCoverSlideXml(coverTemplate, options.coverCtx));

  const mediaFiles: string[] = [];
  const imageWarnings: string[] = [];
  let slideNum = 2;

  async function appendCatalogSlide(
    sourceZip: JSZip,
    sourceSlideIndex: number,
    ctx: CatalogSlideContext,
    imageUrls: string[]
  ): Promise<void> {
    const templateXml = await readZipText(
      sourceZip,
      `ppt/slides/slide${sourceSlideIndex}.xml`
    );
    const templateRels = await readZipText(
      sourceZip,
      `ppt/slides/_rels/slide${sourceSlideIndex}.xml.rels`
    );
    let slideXml = applyCatalogSlideXml(templateXml, ctx);
    const slideMediaFiles: string[] = [];

    for (const imageUrl of imageUrls) {
      const img = await fetchCatalogImageBytes(imageUrl);
      if (img && img.data.byteLength > 0) {
        const mediaFile = `catalog-${slideNum}-${slideMediaFiles.length + 1}.${img.ext}`;
        outZip.file(`ppt/media/${mediaFile}`, img.data);
        mediaFiles.push(mediaFile);
        slideMediaFiles.push(mediaFile);
      } else if (imageUrl.trim()) {
        imageWarnings.push(imageUrl.trim());
      }
    }

    const { slideXml: patchedXml, rels: patchedRels } = applySlideMediaFiles(
      slideXml,
      templateRels,
      slideMediaFiles
    );
    const slideRels = updateSlideRelsWithMediaFiles(patchedRels, {
      productUrl: ctx.productUrl?.trim() || "",
      mountingUrl: ctx.mountingUrl?.trim() || "",
      mediaFiles: [],
    });
    slideXml = patchedXml;

    outZip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);
    outZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, slideRels);
    slideNum += 1;
  }

  for (const { ctx, plan } of options.catalogSlides) {
    const sourceBuf = templates[plan.kind];
    const sourceZip = await JSZip.loadAsync(sourceBuf);

    if (plan.kind === "three") {
      const urls = plan.imageUrls;
      await appendCatalogSlide(sourceZip, 1, ctx, urls.slice(0, 1));
      await appendCatalogSlide(sourceZip, 2, ctx, urls.slice(1, 3));
      continue;
    }

    await appendCatalogSlide(sourceZip, 1, ctx, plan.imageUrls);
  }

  const slideCount = slideNum - 1;
  const { rels: presRels, slideRIds } = patchPresentationRels(presRelsTemplate, slideCount);
  outZip.file("ppt/presentation.xml", patchPresentationXml(presTemplate, slideRIds));
  outZip.file("ppt/_rels/presentation.xml.rels", presRels);
  outZip.file("[Content_Types].xml", patchContentTypes(contentTypes, slideCount, mediaFiles));

  const blob = await outZip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return { blob, imageWarnings };
}

export function triggerPresentationDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
