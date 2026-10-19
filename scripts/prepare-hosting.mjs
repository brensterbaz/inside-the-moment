import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Package only the built application, not the workspace or imported project notes.
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const output = join(root, ".vercel", "output");
await access(join(dist, "index.html"));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(dist, join(output, "static"), { recursive: true });
await writeFile(
  join(output, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      {
        src: "/.*",
        headers: {
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff",
        },
        continue: true,
      },
      { handle: "filesystem" },
    ],
  }, null, 2) + "\n",
);
console.log("HTTPS deployment package ready: .vercel/output (static app only).");
