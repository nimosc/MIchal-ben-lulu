import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { writeFile, readFile, rm, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join, basename } from "path";
import { platform } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function convertWithPowerPoint(pptxPath: string, pdfPath: string): Promise<void> {
  const esc = (p: string) => p.replace(/'/g, "''");
  const script = `
$ErrorActionPreference = 'Stop'
$pptx = '${esc(pptxPath)}'
$pdf = '${esc(pdfPath)}'
Get-Process POWERPNT -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
$pp = New-Object -ComObject PowerPoint.Application
$pp.DisplayAlerts = 1
$pp.Visible = -1
$pres = $null
try {
  $pres = $pp.Presentations.Open($pptx)
  # ppFixedFormatTypePDF = 2
  $pres.ExportAsFixedFormat($pdf, 2, 1, $false, 1)
} finally {
  if ($pres -ne $null) { $pres.Close() | Out-Null }
  try { $pp.Quit() | Out-Null } catch { }
}
if (-not (Test-Path -LiteralPath $pdf)) { throw "PDF not created: $pdf" }
`;
  const psPath = join(tmpdir(), `ppt-to-pdf-${randomUUID()}.ps1`);
  await writeFile(psPath, script, "utf8");
  try {
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psPath],
      { timeout: 180_000, windowsHide: true }
    );
  } finally {
    await rm(psPath, { force: true }).catch(() => {});
  }
}

async function convertWithLibreOffice(pptxPath: string, outDir: string): Promise<string> {
  const bins = [
    process.env.LIBREOFFICE_PATH,
    "soffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
  ].filter(Boolean) as string[];

  let lastErr: unknown;
  for (const bin of bins) {
    try {
      await execFileAsync(
        bin,
        [
          "--headless",
          "--nologo",
          "--nofirststartwizard",
          "--convert-to",
          "pdf",
          "--outdir",
          outDir,
          pptxPath,
        ],
        { timeout: 180_000, windowsHide: true }
      );
      const pdfName = basename(pptxPath).replace(/\.pptx$/i, ".pdf");
      return join(outDir, pdfName);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("LibreOffice לא זמין — התקן LibreOffice או הפעל עם Microsoft PowerPoint");
}

function formatExecError(e: unknown): string {
  if (e instanceof Error) {
    const err = e as Error & { stderr?: string; stdout?: string };
    const extra = [err.stderr, err.stdout].filter(Boolean).join("\n").trim();
    return extra ? `${err.message}\n${extra}` : err.message;
  }
  return String(e);
}

/** המרת PPTX → PDF (PowerPoint ב-Windows, אחרת LibreOffice) */
export async function convertPptxBufferToPdf(pptx: Buffer): Promise<Buffer> {
  const id = randomUUID();
  const dir = join(tmpdir(), `catalog-pdf-${id}`);
  await mkdir(dir, { recursive: true });
  const pptxPath = join(dir, "presentation.pptx");
  const pdfPath = join(dir, "presentation.pdf");
  const errors: string[] = [];

  try {
    await writeFile(pptxPath, pptx);

    if (platform() === "win32") {
      try {
        await convertWithPowerPoint(pptxPath, pdfPath);
        return await readFile(pdfPath);
      } catch (e) {
        errors.push(`PowerPoint: ${formatExecError(e)}`);
      }
    }

    try {
      const outPdf = await convertWithLibreOffice(pptxPath, dir);
      return await readFile(outPdf);
    } catch (e) {
      errors.push(`LibreOffice: ${formatExecError(e)}`);
    }

    const hint =
      platform() === "win32"
        ? "התקן LibreOffice (winget install TheDocumentFoundation.LibreOffice) או תקן את אוטומציית PowerPoint — סגור תצוגה מקדימה של PPTX ב-Explorer."
        : "התקן LibreOffice (soffice) על השרת.";
    throw new Error(
      `המרת PPTX ל-PDF נכשלה.\n${errors.join("\n")}\n\n${hint}`
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
