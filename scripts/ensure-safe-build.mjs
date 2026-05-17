import { isPortInUse } from "./is-port-in-use.mjs";

const portBusy = await isPortInUse(3000);
if (portBusy) {
  console.error(
    "\n[build] Port 3000 is in use (dev server still running).\n" +
      "        Stop it first (Ctrl+C), or run:  npm run dev:reset\n" +
      "        Building while dev runs corrupts .next and causes 500 on static assets.\n"
  );
  process.exit(1);
}
