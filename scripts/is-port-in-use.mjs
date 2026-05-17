import net from "net";

export function isPortInUse(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(true));
    probe.once("listening", () => {
      probe.close(() => resolve(false));
    });
    probe.listen(port, "127.0.0.1");
  });
}
