import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractProductDocuments } from "@/lib/extractProductDocuments";
import { buildScrapeToolSchema } from "@/lib/scrapeSchema";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PRODUCT_TOOL: Anthropic.Tool = {
  name: "save_product_data",
  description: "Save extracted lighting fixture data from a product page",
  input_schema: buildScrapeToolSchema(),
};

async function extractWithTool(pageText: string): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    tools: [PRODUCT_TOOL],
    tool_choice: { type: "tool", name: "save_product_data" },
    messages: [
      {
        role: "user",
        content: `Extract lighting fixture data from this product page and call save_product_data.
Use null for unknown fields. Keep product_description concise in Hebrew.
Extract catalog fields when present: lumens (number), ip_rating, optics (reflector, lens_cover, beam_angle, adjustment, light_distribution), physical dimensions, finish_color (material/finish, NOT color temperature), lamp_life_hours, luminaire_efficiency, glare_rating, light_source.

Page content:
${pageText}`,
      },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Model did not return structured product data");
  }
  return toolBlock.input as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
    });
    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${pageRes.status}` },
        { status: 502 }
      );
    }
    const html = await pageRes.text();

    const imageUrls: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const src = imgMatch[1];
      if (src && !src.startsWith("data:") && src.length > 10) {
        imageUrls.push(src.startsWith("http") ? src : new URL(src, url).href);
      }
    }

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 8000);

    const parsed = await extractWithTool(text);
    const documents = extractProductDocuments(html, url);

    return NextResponse.json({
      ...parsed,
      ...documents,
      image_urls: imageUrls.slice(0, 20),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("scrape error", err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
