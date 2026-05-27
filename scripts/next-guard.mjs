import { spawn, spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");
const nextBin = join(appRoot, "node_modules", "next", "dist", "bin", "next");
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/next-guard.mjs <dev|build|start|...> [args]");
  process.exit(1);
}

if (command === "build") {
  const preflight = spawnSync(process.execPath, [join(__dirname, "ensure-safe-build.mjs")], {
    stdio: "inherit",
    cwd: appRoot,
  });
  if (preflight.status !== 0) process.exit(preflight.status ?? 1);
}

if (command === "dev") {
  const preflight = spawnSync(process.execPath, [join(__dirname, "ensure-dev-next.mjs")], {
    stdio: "inherit",
    cwd: appRoot,
  });
  if (preflight.status !== 0) process.exit(preflight.status ?? 1);
}

const env = { ...process.env };
if (command === "dev") {
  const patch = join(__dirname, "patch-next-server-chunks.cjs");
  const flag = `--require ${patch}`;
  env.NODE_OPTIONS = env.NODE_OPTIONS
    ? env.NODE_OPTIONS.includes(flag)
      ? env.NODE_OPTIONS
      : `${env.NODE_OPTIONS} ${flag}`
    : flag;
}

const child = spawn(process.execPath, [nextBin, command, ...args], {
  stdio: "inherit",
  cwd: appRoot,
  env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
