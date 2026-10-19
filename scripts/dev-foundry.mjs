import { spawn } from "node:child_process";
import { resolve } from "node:path";

const children = [
  spawn(
    process.execPath,
    [resolve("node_modules/tsx/dist/cli.mjs"), "server/index.ts"],
    { stdio: "inherit" },
  ),
  spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js")], {
    stdio: "inherit",
    env: { ...process.env, VITE_FOUNDRY_LOCAL: "1" },
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 0));
}
process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
