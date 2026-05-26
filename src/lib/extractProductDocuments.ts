export interface ProductDocuments {
  tech_spec_url: string | null;
  mounting_instructions_url: string | null;
}

const TECH_LABEL =
  /tech\s*spec|technical\s*(catalog|sheet|data)?|datasheet|data\s*sheet|catalogue|catalog|specification\s*sheet|קטלוג|מפרט\s*טכני/i;
const MOUNT_LABEL =
  /mounting\s*instructions?|installation\s*(guide|instructions?|manual)?|assembly|הוראות\s*התקנה|התקנה/i;

function resolveUrl(href: string, pageUrl: string): string {
  try {
    return new URL(href, pageUrl).href;
  } catch {
    return href;
  }
}

/** Pair download-row labels with adjacent PDF links (Flos, similar catalogs). */
export function extractProductDocuments(html: string, pageUrl: string): ProductDocuments {
  const result: ProductDocuments = {
    tech_spec_url: null,
    mounting_instructions_url: null,
  };

  const entries: { label: string; url: string }[] = [];
  const pdfRegex = /href=["']([^"']+\.pdf[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = pdfRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1], pageUrl);
    const before = html.slice(Math.max(0, match.index - 800), match.index);
    const labelMatches = Array.from(
      before.matchAll(/class="text[^"]*"[^>]*>\s*([^<]+)/gi)
    );
    const label = labelMatches.length
      ? labelMatches[labelMatches.length - 1][1].replace(/\s+/g, " ").trim()
      : "";
    entries.push({ label, url });
  }

  for (const { label, url } of entries) {
    if (!result.tech_spec_url && TECH_LABEL.test(label)) {
      result.tech_spec_url = url;
    }
    if (!result.mounting_instructions_url && MOUNT_LABEL.test(label)) {
      result.mounting_instructions_url = url;
    }
  }

  if (!result.tech_spec_url) {
    const tech = entries.find((e) => /tech[-_]?spec|datasheet|technical/i.test(e.url));
    if (tech) result.tech_spec_url = tech.url;
  }

  if (!result.mounting_instructions_url) {
    const mount = entries.find(
      (e) =>
        /mount|install|assembly|התקנה/i.test(e.url) &&
        e.url !== result.tech_spec_url
    );
    if (mount) result.mounting_instructions_url = mount.url;
  }

  return result;
}
