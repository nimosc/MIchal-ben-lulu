import { NextRequest, NextResponse } from "next/server";
import { convertPptxBufferToPdf } from "@/lib/convertPptxToPdf.server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "חסר קובץ PPTX" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length < 100) {
      return NextResponse.json({ error: "קובץ PPTX לא תקין" }, { status: 400 });
    }

    const pdf = await convertPptxBufferToPdf(buf);
    const name =
      (typeof file === "object" && "name" in file && String(file.name)) ||
      "presentation.pptx";
    const pdfName = name.replace(/\.pptx$/i, "") + ".pdf";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(pdfName)}"`,
      },
    });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "המרת PPTX ל-PDF נכשלה — ודא ש-Microsoft PowerPoint או LibreOffice מותקנים";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
