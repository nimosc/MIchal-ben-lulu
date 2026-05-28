import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** PDF מהתצוגה המקדימה — גיבוי כשהשרת לא ממיר PPTX (אין LibreOffice / PowerPoint COM) */
export async function downloadPresentationPdfFromPreview(
  container: HTMLElement,
  baseFilename: string
): Promise<void> {
  const slides = container.querySelectorAll<HTMLElement>("[data-pdf-slide]");
  if (slides.length === 0) {
    throw new Error("אין שקפים לייצוא");
  }

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [1280, 720],
  });

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const canvas = await html2canvas(slide, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage([1280, 720], "landscape");
    pdf.addImage(img, "JPEG", 0, 0, 1280, 720);
  }

  const pdfName = baseFilename.replace(/\.pptx$/i, "") + "-preview.pdf";
  pdf.save(pdfName);
}
