import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// A separate build keeps local-AI capability out of the ordinary static deployment.
const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/vite/bin/vite.js"),
    "build",
    "--outDir",
    ".foundry/headset-build",
  ],
  { stdio: "inherit", env: { ...process.env, VITE_FOUNDRY_LOCAL: "1" } },
);
process.exitCode = result.status ?? 1;
