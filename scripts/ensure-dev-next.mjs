import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { isPortInUse } from "./is-port-in-use.mjs";

const nextDir = join(process.cwd(), ".next");
const exportMarker = join(nextDir, "export-marker.json");
const devMainApp = join(nextDir, "static/chunks/main-app.js");
const buildManifestPath = join(nextDir, "build-manifest.json");

function analyzeNextDir() {
  const hasExportMarker = existsSync(exportMarker);
  const hasDevMainApp = existsSync(devMainApp);

  let expectsDevMainApp = false;
  if (existsSync(buildManifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(buildManifestPath, "utf8"));
      expectsDevMainApp = manifest.rootMainFiles?.includes(
        "static/chunks/main-app.js"
      );
    } catch {
      expectsDevMainApp = false;
    }
  }

  const isCorruptDevBuild =
    existsSync(nextDir) && expectsDevMainApp && !hasDevMainApp;
  const needsClean = hasExportMarker || isCorruptDevBuild;

  return { hasExportMarker, isCorruptDevBuild, needsClean };
}

const state = analyzeNextDir();
const portBusy = await isPortInUse(3000);

if (state.needsClean) {
  if (portBusy) {
    console.error(
      "\n[dev] Port 3000 is in use and .next is stale (production or corrupt dev build).\n" +
        "       This causes 404/500 on layout.css, main-app.js, page.js, etc.\n" +
        "       Run:  npm run dev:reset\n" +
        "       Or stop the server (Ctrl+C) and run:  npm run dev\n"
    );
    process.exit(1);
  }

  rmSync(nextDir, { recursive: true, force: true });
  const reason = state.hasExportMarker
    ? "production build artifacts"
    : "corrupt dev build (manifest references missing chunks)";
  console.log(`[dev] Removed .next (${reason}) — starting fresh dev compile.`);
}
