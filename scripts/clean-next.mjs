import { rmSync } from "fs";
import { join } from "path";

const nextDir = join(process.cwd(), ".next");
rmSync(nextDir, { recursive: true, force: true });
console.log("[clean-next] Removed .next");
