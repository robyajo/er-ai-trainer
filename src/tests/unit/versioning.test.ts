import { describe, expect, it } from "vitest";
import {
  computeNextErAiVersion,
  getLatestErAiVersion,
} from "@/ipc/trainer/handlers";

describe("ER-AI Model Versioning Logic", () => {
  it("computes initial version er-ai-code:v1.0 when no versioned models exist", () => {
    expect(computeNextErAiVersion([])).toBe("er-ai-code:v1.0");
    expect(computeNextErAiVersion(["qwen2.5-coder:3b", "deepseek-r1:1.5b"])).toBe("er-ai-code:v1.0");
    expect(computeNextErAiVersion(["er-ai-code:latest", "er-ai-project:latest"])).toBe("er-ai-code:v1.0");
  });

  it("increments minor version correctly for er-ai-code models", () => {
    expect(computeNextErAiVersion(["er-ai-code:v1.0"])).toBe("er-ai-code:v1.1");
    expect(computeNextErAiVersion(["er-ai-code:v1.0", "er-ai-code:v1.1", "er-ai-code:v1.2"])).toBe("er-ai-code:v1.3");
    expect(computeNextErAiVersion(["er-ai-code:v1.9"])).toBe("er-ai-code:v1.10");
  });

  it("smoothly transitions and increments from legacy er-ai models", () => {
    expect(computeNextErAiVersion(["er-ai:v1.0"])).toBe("er-ai-code:v1.1");
    expect(computeNextErAiVersion(["er-ai:v1.5"])).toBe("er-ai-code:v1.6");
  });

  it("supports dedicated prefixes like er-ai-assistant and er-ai-vision", () => {
    expect(computeNextErAiVersion([], "er-ai-assistant")).toBe("er-ai-assistant:v1.0");
    expect(computeNextErAiVersion(["er-ai-assistant:v1.0"], "er-ai-assistant")).toBe("er-ai-assistant:v1.1");
    expect(computeNextErAiVersion([], "er-ai-vision")).toBe("er-ai-vision:v1.0");
  });

  it("increments correctly when major version is bumped", () => {
    expect(computeNextErAiVersion(["er-ai-code:v1.5", "er-ai-code:v2.0"])).toBe("er-ai-code:v2.1");
  });

  it("finds the latest er-ai-code or legacy er-ai version", () => {
    expect(getLatestErAiVersion([])).toBe(null);
    expect(getLatestErAiVersion(["er-ai-code:latest"])).toBe("er-ai-code:latest");
    expect(
      getLatestErAiVersion(["qwen2.5-coder:3b", "er-ai-code:v1.0", "er-ai-code:v1.1", "deepseek-r1:1.5b"])
    ).toBe("er-ai-code:v1.1");
    expect(
      getLatestErAiVersion(["er-ai-code:v1.12", "er-ai-code:v1.3", "er-ai-code:v1.0"])
    ).toBe("er-ai-code:v1.12");
    expect(
      getLatestErAiVersion(["qwen2.5-coder:3b", "er-ai:v1.0", "er-ai:v1.2"])
    ).toBe("er-ai:v1.2");
  });
});
