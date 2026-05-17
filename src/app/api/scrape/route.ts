import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PRODUCT_TOOL: Anthropic.Tool = {
  name: "save_product_data",
  description: "Save extracted lighting fixture data from a product page",
  input_schema: {
    type: "object",
    properties: {
      product_name: { type: ["string", "null"] },
      manufacturer: { type: ["string", "null"] },
      model: { type: ["string", "null"] },
      color_temp_k: { type: ["number", "null"] },
      cri: { type: ["number", "null"] },
      watt_per_unit: { type: ["number", "null"] },
      voltage: { type: ["string", "null"] },
      current: { type: ["string", "null"] },
      max_ceiling_height_cm: { type: ["number", "null"] },
      main_image_url: { type: ["string", "null"] },
      product_description: {
        type: ["string", "null"],
        description: "Short Hebrew description, 1-3 sentences",
      },
      variants: {
        type: ["array", "null"],
        description: "Product variants if multiple models exist on page, max 8",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            model: { type: ["string", "null"] },
            color_temp_k: { type: ["number", "null"] },
            cri: { type: ["number", "null"] },
            watt_per_unit: { type: ["number", "null"] },
            voltage: { type: ["string", "null"] },
            current: { type: ["string", "null"] },
            max_ceiling_height_cm: { type: ["number", "null"] },
          },
          required: ["label"],
        },
      },
    },
  },
};

async function extractWithTool(pageText: string): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    tools: [PRODUCT_TOOL],
    tool_choice: { type: "tool", name: "save_product_data" },
    messages: [
      {
        role: "user",
        content: `Extract lighting fixture data from this product page and call save_product_data.
Use null for unknown fields. Keep product_description concise in Hebrew.

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

    return NextResponse.json({ ...parsed, image_urls: imageUrls.slice(0, 20) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("scrape error", err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
