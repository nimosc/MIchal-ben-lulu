export type DownloadPresentationPdfOptions = {
  /** מכולת תצוגה מקדימה — אם ההמרה בשרת נכשלת, יורד PDF מה-HTML */
  previewContainer?: HTMLElement | null;
};

/** שולח PPTX לשרת להמרה; בכשלון אופציונלי — PDF מהתצוגה המקדימה */
export async function downloadPresentationPdfFromPptx(
  pptxBlob: Blob,
  pptxFilename: string,
  options?: DownloadPresentationPdfOptions
): Promise<"pptx" | "preview"> {
  const form = new FormData();
  form.append("file", pptxBlob, pptxFilename);

  const res = await fetch("/api/export-presentation-pdf", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let message = `המרה ל-PDF נכשלה (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }

    if (options?.previewContainer) {
      const { downloadPresentationPdfFromPreview } = await import(
        "@/lib/downloadPresentationPdfFromPreview"
      );
      await downloadPresentationPdfFromPreview(options.previewContainer, pptxFilename);
      return "preview";
    }

    throw new Error(message);
  }

  const pdfBlob = await res.blob();
  const pdfName = pptxFilename.replace(/\.pptx$/i, "") + ".pdf";
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = pdfName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "pptx";
}
