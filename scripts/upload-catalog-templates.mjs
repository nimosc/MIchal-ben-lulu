/**
 * Upload default catalog PPTX templates from public/templates/ to Supabase Storage.
 * Usage: node scripts/upload-catalog-templates.mjs [--force]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");

const KINDS = [
  { kind: "cover", file: "cover-template.pptx" },
  { kind: "single", file: "single-image-template.pptx" },
  { kind: "two", file: "two-images-template.pptx" },
  { kind: "three", file: "three-images-template.pptx" },
];

const BUCKET = process.env.NEXT_PUBLIC_CATALOG_TEMPLATE_BUCKET ?? "catalog-templates";
const PREFIX = "shared";
const STATE_PATH = `${PREFIX}/catalog-templates-v2-state.json`;

function loadEnvLocal() {
  const envPath = path.join(appRoot, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function readState(supabase) {
  const { data, error } = await supabase.storage.from(BUCKET).download(STATE_PATH);
  if (error) {
    const code = error.statusCode ?? error.status;
    if (code === 404 || code === 400 || code === "404" || code === "400") return {};
    throw error;
  }
  return JSON.parse(await data.text());
}

async function writeState(supabase, state) {
  const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
  const { error } = await supabase.storage.from(BUCKET).upload(STATE_PATH, blob, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}

async function uploadKind(supabase, kind, filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  const uploadedAt = Date.now();
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const versionedPath = `${PREFIX}/${kind}-template-${uploadedAt}-${safeName}`;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(versionedPath, blob, {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    upsert: false,
  });
  if (upErr) throw upErr;

  return {
    path: versionedPath,
    meta: { filename, uploadedAt, size: buffer.byteLength },
  };
}

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing in .env.local");

  const supabase = createClient(url, key);
  const templatesDir = path.join(appRoot, "public/templates");
  let state = await readState(supabase);

  for (const { kind, file } of KINDS) {
    const filePath = path.join(templatesDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`skip ${kind}: missing ${file}`);
      continue;
    }
    if (state[kind] && !force) {
      console.log(`skip ${kind}: already in Supabase (use --force)`);
      continue;
    }

    const previous = state[kind];
    console.log(`upload ${kind} ← ${file} (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB)`);
    const entry = await uploadKind(supabase, kind, filePath, file);
    state[kind] = entry;
    await writeState(supabase, state);

    if (previous?.path && previous.path !== entry.path) {
      await supabase.storage.from(BUCKET).remove([previous.path]);
    }
    console.log(`  ✓ ${entry.path}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
