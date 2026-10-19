import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { AnalysisService } from "./analysis";
import { FoundryRuntime, MODEL_ID } from "./foundry";
import { parseAnalysisRequest } from "../src/analysis-contract";

export function startAnalysisServer(runtime = new FoundryRuntime()) {
  const service = new AnalysisService(runtime.generate);
  const server = createServer(async (request, response) => {
    const send = (status: number, body: unknown) => {
      if (response.destroyed) return;
      response.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(JSON.stringify(body));
    };
    if (
      !["127.0.0.1:5175", "localhost:5175"].includes(
        request.headers.host ?? "",
      ) ||
      (request.headers.origin &&
        !["http://127.0.0.1:5174", "http://localhost:5174"].includes(
          request.headers.origin,
        ))
    ) {
      send(403, { error: "Only the local replay may use this API." });
      return;
    }
    if (request.url === "/api/analysis/health" && request.method === "GET") {
      send(200, {
        provider: "foundry-local",
        phase: runtime.phase,
        progress: runtime.progress,
        model: MODEL_ID,
      });
      return;
    }
    if (request.url !== "/api/analysis") {
      send(404, { error: "Unknown endpoint." });
      return;
    }
    if (request.method !== "POST") {
      send(405, { error: "POST required." });
      return;
    }
    if (!request.headers["content-type"]?.startsWith("application/json")) {
      send(415, { error: "JSON required." });
      return;
    }
    let body = "",
      size = 0;
    try {
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk);
        if (size > 2048) {
          send(413, { error: "Request is too large." });
          return;
        }
        body += chunk;
      }
      let input;
      try {
        input = parseAnalysisRequest(JSON.parse(body));
      } catch {
        send(400, {
          error:
            "Choose a recorded player, topic, preferences and valid replay time.",
        });
        return;
      }
      if (runtime.phase !== "ready") {
        send(503, {
          error:
            "The local model is not ready. Use the scripted explanation or wait for model setup.",
        });
        return;
      }
      const controller = new AbortController();
      response.on("close", () => {
        if (!response.writableEnded) controller.abort();
      });
      try {
        send(200, await service.analyse(input, controller.signal));
      } catch (error) {
        const busy = error instanceof Error && error.message === "BUSY";
        console.warn(
          "Local analysis failed:",
          error instanceof Error ? error.message : "Unknown model error.",
        );
        send(busy ? 429 : 502, {
          error: busy
            ? "The local model is answering another question. Try again shortly."
            : "The local answer could not be validated. The scripted explanation remains available.",
        });
      }
    } catch {
      send(400, { error: "Unable to read this request." });
    }
  });
  server.requestTimeout = 10_000;
  server.listen(5175, "127.0.0.1", () =>
    console.log("Local analyst API: http://127.0.0.1:5175"),
  );
  server.on("error", (error) => {
    console.error("Local analyst API could not start:", error.message);
    process.exitCode = 1;
  });
  void runtime.initialise();
  return { server, runtime };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { server, runtime } = startAnalysisServer();
  const close = () => {
    server.close();
    void runtime.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
