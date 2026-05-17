import { execSync } from "child_process";

const port = Number(process.argv[2] ?? "3000");
const isWin = process.platform === "win32";

function getPidsOnPort() {
  if (isWin) {
    const out = execSync(`netstat -ano | findstr ":${port}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  }

  const out = execSync(`lsof -ti :${port}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const pids = getPidsOnPort();
if (pids.length === 0) {
  console.log(`[kill-port] No process listening on port ${port}.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    if (isWin) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    console.log(`[kill-port] Stopped PID ${pid} on port ${port}.`);
  } catch {
    console.warn(`[kill-port] Could not stop PID ${pid}.`);
  }
}
