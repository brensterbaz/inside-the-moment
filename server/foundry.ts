import {
  FoundryLocalManager,
  ChatSession,
  Request,
  Item,
  type IModel,
  type Response,
} from "foundry-local-sdk";
import { resolve } from "node:path";
import type { Generate } from "./analysis";

export const MODEL_ID = "qwen2.5-1.5b-instruct-generic-cpu:4";
export class FoundryRuntime {
  private manager?: FoundryLocalManager;
  private model?: IModel;
  private initialising?: Promise<void>;
  private downloadController = new AbortController();
  private activeRequest?: Request;
  private activeRun?: Promise<Response>;
  phase: "starting" | "downloading" | "loading" | "ready" | "error" =
    "starting";
  progress = 0;
  initialise() {
    return (this.initialising ??= this.setup());
  }
  private async setup() {
    try {
      this.manager = FoundryLocalManager.create({
        appName: "inside-the-moment",
        appDataDir: resolve(".foundry/data"),
        modelCacheDir: resolve(".foundry/models"),
        logsDir: resolve(".foundry/logs"),
        logLevel: "error",
        disableNonessentialTelemetry: true,
      });
      this.model = await this.manager.catalog.getModelVariant(MODEL_ID);
      this.phase = "downloading";
      let last = -1;
      await this.model.download((progress) => {
        this.progress = Math.round(progress);
        const bucket = Math.floor(progress / 10);
        if (bucket !== last) {
          last = bucket;
          console.log(`Foundry Local model download: ${this.progress}%`);
        }
      }, this.downloadController.signal);
      this.downloadController.signal.throwIfAborted();
      this.phase = "loading";
      await this.model.load();
      this.phase = "ready";
      console.log(`Foundry Local ready: ${this.model.id}`);
    } catch (error) {
      this.phase = "error";
      console.error(
        "Foundry Local initialisation failed:",
        error instanceof Error ? error.message : "Unknown native error.",
      );
    }
  }
  generate: Generate = async (system, prompt, signal) => {
    if (!this.model || this.phase !== "ready") throw new Error("UNAVAILABLE");
    signal?.throwIfAborted();
    const session = new ChatSession(this.model);
    const request = new Request()
      .addItem(Item.systemMessage(system))
      .addItem(Item.userMessage(prompt))
      .setOptions({
        search: {
          temperature: 0,
          doSample: false,
          seed: 7,
          maxOutputTokens: 128,
        },
      });
    const cancel = () => request.cancel();
    const timer = setTimeout(cancel, 45_000);
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      const started = performance.now();
      this.activeRequest = request;
      this.activeRun = session.processRequest(request);
      const response = await this.activeRun;
      console.log(
        `Foundry inference: ${Math.round(performance.now() - started)}ms, ${response.finishReason}, ${response.usage.completionTokens} output tokens`,
      );
      if (signal?.aborted || response.finishReason !== "stop")
        throw new Error("The local model did not complete its answer.");
      const text = response.output
        .map((item) => {
          if (
            item.type === "text" &&
            (!item.textType || item.textType === "default")
          )
            return item.text;
          if (item.type === "message" && item.role === "assistant")
            return (
              item.content ??
              item.parts
                ?.filter(
                  (p) =>
                    p.type === "text" &&
                    (!p.textType || p.textType === "default"),
                )
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("") ??
              ""
            );
          return "";
        })
        .join("");
      return {
        text,
        model: this.model.id,
        elapsedMs: Math.round(performance.now() - started),
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      session.dispose();
      this.activeRequest = undefined;
      this.activeRun = undefined;
    }
  };
  async close() {
    this.downloadController.abort();
    this.activeRequest?.cancel();
    await this.initialising?.catch(() => {});
    await this.activeRun?.catch(() => {});
    if (await this.model?.isLoaded()) await this.model!.unload();
    this.manager?.dispose();
  }
}
