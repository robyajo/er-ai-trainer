import fsSync from "node:fs";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import nodeOs from "node:os";
import { os } from "@orpc/server";
import { dialog } from "electron";
import { ipcContext } from "../context";
import {
  addProjectsToQueueInputSchema,
  chatWithModelInputSchema,
  deleteOllamaModelInputSchema,
  deleteProjectFromQueueInputSchema,
  exportModelfileInputSchema,
  getModelInfoInputSchema,
  getOllamaPublicKeyInputSchema,
  getOpenCodeStatusInputSchema,
  pushOllamaModelInputSchema,
  runOpenCodePromptInputSchema,
  pullOllamaModelInputSchema,
  processSingleProjectTrainingInputSchema,
  saveModelfileToDiskInputSchema,
  saveProjectRulesInputSchema,
  scanProjectInputSchema,
  testModelInputSchema,
  toggleIgnoreProjectInputSchema,
  trainModelInputSchema,
} from "./schemas";
import {
  deleteProjectFromDb,
  getAllProjects,
  getProjectByPath,
  type ProjectRecord,
  toggleIgnoreProject as toggleIgnoreInDb,
  upsertProject,
} from "../db/database";

export interface ProjectAnalysis {
  name: string;
  path: string;
  techStack: string[];
  frameworks: string[];
  summary: string;
  folderTree: string[];
  keyFiles: Array<{ name: string; path: string; description: string }>;
  packageInfo?: {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  suggestedPrompt: string;
}

export const selectFolder = os
  .use(ipcContext.mainWindowContext)
  .handler(async ({ context }) => {
    const { window } = context;
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory"],
      title: "Pilih Folder Project untuk ER-AI",
    });

    return {
      canceled: result.canceled,
      path: result.filePaths[0] || null,
    };
  });


function getOpenCodeBin(): string | null {
  const homePath = path.join(process.env.HOME || "", ".opencode/bin/opencode");
  if (fsSync.existsSync(homePath)) return homePath;
  try {
    const which = execSync("which opencode", { encoding: "utf8" }).trim();
    if (which && fsSync.existsSync(which)) return which;
  } catch {}
  return null;
}

async function executeOpenCode(
  binPath: string,
  modelName: string,
  prompt: string,
  cwd?: string
): Promise<{ text: string; durationMs: number }> {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(
      binPath,
      ["run", "-m", modelName, "--format", "json", prompt],
      {
        cwd: cwd || process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });

    child.on("close", (code) => {
      const durationMs = Date.now() - startTime;
      if (code !== 0 && !output.includes('"type":"text"')) {
        reject(new Error(errorOutput || `OpenCode process exited with code ${code}`));
        return;
      }

      let parsedText = "";
      const lines = output.trim().split("\n");
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "text" && parsed.part?.text) {
            parsedText += parsed.part.text;
          }
        } catch {}
      }

      resolve({
        text: parsedText.trim() || output.trim(),
        durationMs,
      });
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

export const getOpenCodeStatus = os.handler(async () => {
  const bin = getOpenCodeBin();
  if (!bin) {
    return {
      available: false,
      binPath: null,
      models: [],
      freeModels: [],
    };
  }

  try {
    const modelsRaw = execSync(`"${bin}" models`, { encoding: "utf8" });
    const models = modelsRaw
      .trim()
      .split("\n")
      .map((m) => m.trim())
      .filter((m) => m.startsWith("opencode/"));
    const freeModels = models.filter((m) => m.includes("free"));

    return {
      available: true,
      binPath: bin,
      models,
      freeModels:
        freeModels.length > 0
          ? freeModels
          : [
              "opencode/nemotron-3.5-lightning-free",
              "opencode/mimo-v2.6-flash-free",
            ],
    };
  } catch {
    return {
      available: true,
      binPath: bin,
      models: [
        "opencode/nemotron-3.5-lightning-free",
        "opencode/mimo-v2.6-flash-free",
        "opencode/gemini-3.8-flash",
      ],
      freeModels: [
        "opencode/nemotron-3.5-lightning-free",
        "opencode/mimo-v2.6-flash-free",
      ],
    };
  }
});

export const runOpenCodePrompt = os
  .input(runOpenCodePromptInputSchema)
  .handler(async ({ input }) => {
    const bin = getOpenCodeBin();
    if (!bin) {
      return {
        success: false,
        response: "",
        durationMs: 0,
        error:
          "OpenCode CLI tidak ditemukan di sistem (~/.opencode/bin/opencode)",
      };
    }

    try {
      const result = await executeOpenCode(
        bin,
        input.modelName,
        input.prompt,
        input.projectPath
      );
      return {
        success: true,
        response: result.text,
        durationMs: result.durationMs,
      };
    } catch (err: any) {
      return {
        success: false,
        response: "",
        durationMs: 0,
        error: err.message || "Gagal menjalankan OpenCode prompt",
      };
    }
  });

export const getOllamaModels = os.handler(async () => {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return { online: false, models: [], error: `Status ${res.status}` };
    }
    const data = (await res.json()) as {
      models: Array<{
        name: string;
        size: number;
        modified_at: string;
        details?: { parameter_size?: string; quantization_level?: string };
      }>;
    };

    const rawModels = data.models || [];
    const cleanModels: typeof rawModels = [];
    const seenNames = new Set<string>();

    // 1. Kumpulkan model yang sudah berformat nama bersih (tanpa prefix "username/")
    for (const m of rawModels) {
      if (!m.name.includes("/")) {
        cleanModels.push(m);
        seenNames.add(m.name);
      }
    }

    // 2. Normalisasi model yang ber-namespace remote (misal: "robyfull/er-ai:v1.1")
    for (const m of rawModels) {
      if (m.name.includes("/")) {
        const cleanName = m.name.split("/").pop()!;
        if (seenNames.has(cleanName)) {
          // Model bersih ("er-ai:v1.1") sudah ada. Hapus tag duplikat namespace di Ollama lokal.
          fetch("http://localhost:11434/api/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: m.name }),
          }).catch(() => {});
        } else {
          // Model bersih belum ada (misal ditarik manual dari registry).
          // Buat tag bersih di Ollama lokal lalu bersihkan tag remote.
          fetch("http://localhost:11434/api/copy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: m.name, destination: cleanName }),
          })
            .then(() => {
              fetch("http://localhost:11434/api/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: m.name }),
              }).catch(() => {});
            })
            .catch(() => {});

          cleanModels.push({
            ...m,
            name: cleanName,
          });
          seenNames.add(cleanName);
        }
      }
    }

    return {
      online: true,
      models: cleanModels,
      error: null,
    };
  } catch (err: any) {
    return {
      online: false,
      models: [],
      error: err.message || "Gagal terhubung ke Ollama (localhost:11434)",
    };
  }
});

export const pullOllamaModel = os
  .input(pullOllamaModelInputSchema)
  .handler(async ({ input }) => {
    try {
      const res = await fetch("http://localhost:11434/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: input.modelName,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          model: input.modelName,
          message: `Gagal mengunduh model (HTTP ${res.status}): ${errText}`,
        };
      }

      const data = (await res.json()) as any;
      if (data.error) {
        return {
          success: false,
          model: input.modelName,
          message: data.error,
        };
      }

      let finalModelName = input.modelName;

      // Jika model ditarik dengan namespace username (misal: "robyfull/er-ai:v1.1"),
      // otomatis buat tag nama bersih (misal: "er-ai:v1.1") dan bersihkan tag namespace lokal.
      if (input.modelName.includes("/")) {
        const cleanName = input.modelName.split("/").pop();
        if (cleanName) {
          try {
            await fetch("http://localhost:11434/api/copy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source: input.modelName,
                destination: cleanName,
              }),
            });
            await fetch("http://localhost:11434/api/delete", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: input.modelName }),
            });
            finalModelName = cleanName;
          } catch (_) {}
        }
      }

      return {
        success: true,
        model: finalModelName,
        message: `Model "${finalModelName}" berhasil diunduh dan siap digunakan!`,
      };
    } catch (err: any) {
      return {
        success: false,
        model: input.modelName,
        message: err.message || "Gagal menghubungkan ke Ollama untuk mengunduh model",
      };
    }
  });

export const deleteOllamaModel = os
  .input(deleteOllamaModelInputSchema)
  .handler(async ({ input }) => {
    try {
      const res = await fetch("http://localhost:11434/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: input.modelName }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          model: input.modelName,
          message: `Gagal menghapus model (HTTP ${res.status}): ${errorText}`,
        };
      }
      return {
        success: true,
        model: input.modelName,
        message: `Model "${input.modelName}" berhasil dihapus dari Ollama!`,
      };
    } catch (err: any) {
      return {
        success: false,
        model: input.modelName,
        message: err.message || "Gagal menghubungi Ollama untuk menghapus model",
      };
    }
  });

export async function readOllamaPublicKeyInfo() {
  const homeDir = process.env.HOME || "";
  const systemServiceKey = "/usr/share/ollama/.ollama/id_ed25519.pub";
  const userKeyPath = path.join(homeDir, ".ollama", "id_ed25519.pub");

  let keyPath = "";
  let pubKey: string | null = null;
  let isSystemService = false;

  // On Linux, Ollama is usually running as a systemd service under user ollama (/usr/share/ollama)
  if (fsSync.existsSync(systemServiceKey)) {
    try {
      pubKey = (await fs.readFile(systemServiceKey, "utf-8")).trim();
      keyPath = systemServiceKey;
      isSystemService = true;
    } catch {}
  }

  if (!pubKey && fsSync.existsSync(userKeyPath)) {
    try {
      pubKey = (await fs.readFile(userKeyPath, "utf-8")).trim();
      keyPath = userKeyPath;
    } catch {}
  }

  if (pubKey) {
    const rawKey = pubKey.split(" ")[1] ? pubKey.split(" ").slice(0, 2).join(" ") : pubKey;
    const hostname = nodeOs.hostname() || "pc";
    const b64Key = Buffer.from(rawKey.trim()).toString("base64").replace(/=+$/, "");
    const connectUrl = `https://ollama.com/connect?name=${encodeURIComponent(hostname)}&key=${b64Key}`;

    return {
      exists: true,
      keyPath,
      publicKey: rawKey,
      connectUrl,
      isSystemService,
    };
  }

  return {
    exists: false,
    keyPath: userKeyPath,
    publicKey: null,
    connectUrl: null,
    isSystemService: false,
  };
}

export const getOllamaPublicKey = os.handler(async () => {
  return await readOllamaPublicKeyInfo();
});

export const pushOllamaModel = os
  .input(pushOllamaModelInputSchema)
  .handler(async ({ input }) => {
    const { sourceModel, targetModel } = input;
    // Step 1: Copy/tag sourceModel to targetModel if different
    if (sourceModel !== targetModel) {
      try {
        const copyRes = await fetch("http://localhost:11434/api/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: sourceModel,
            destination: targetModel,
          }),
        });
        if (!copyRes.ok) {
          const errText = await copyRes.text();
          return {
            success: false,
            targetModel,
            message: `Gagal menyiapkan tag model "${targetModel}" (${copyRes.status}): ${errText}`,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          targetModel,
          message: `Gagal menyiapkan tag model: ${err.message}`,
        };
      }
    }

    // Step 2: Push to Ollama registry
    try {
      const pushRes = await fetch("http://localhost:11434/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModel,
          stream: false,
        }),
      });

      const data = (await pushRes.json()) as any;
      if (!pushRes.ok || data.error) {
        const errMsg = data.error || `HTTP ${pushRes.status}`;
        let guidance = "";
        if (
          errMsg.includes("ANONYMOUS_ACCESS_DENIED") ||
          errMsg.includes("403") ||
          errMsg.includes("unauthorized")
        ) {
          const keyInfo = await readOllamaPublicKeyInfo();
          guidance =
            `\n\n🔑 OTORISASI DITOLAK (403 ANONYMOUS ACCESS DENIED)\n` +
            `Di Linux, Ollama berjalan sebagai systemd service dengan Kunci Publik:\n` +
            `"${keyInfo.publicKey}"\n\n` +
            `Bukan kunci di ~/.ollama/! Kunci service inilah yang harus Anda daftarkan.\n\n` +
            `👉 Cara menghubungkan akun '${targetModel.split("/")[0]}' (Paling Cepat):\n` +
            `1. Buka tautan 1-Klik ini di browser saat sudah login di Ollama Hub:\n` +
            `   ${keyInfo.connectUrl}\n` +
            `2. Atau salin kunci di atas dan paste manual di https://ollama.com/settings/keys`;
        }
        return {
          success: false,
          targetModel,
          message: `Gagal push ke Ollama (${errMsg})${guidance}`,
        };
      }

      // Jika targetModel berbeda dengan sourceModel (misal di-tag "robyfull/er-ai:v1.1" untuk keperluan push ke remote),
      // bersihkan tag namespace tersebut dari Ollama lokal agar daftar model lokal tetap bersih ("er-ai:v1.1").
      if (sourceModel !== targetModel) {
        try {
          await fetch("http://localhost:11434/api/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: targetModel }),
          });
        } catch (_) {}
      }

      return {
        success: true,
        targetModel,
        message: `Berhasil mem-push model "${targetModel}" ke Ollama Hub!\n\nUntuk menjalankannya di perangkat lain, cukup jalankan:\nollama run ${targetModel}`,
      };
    } catch (err: any) {
      return {
        success: false,
        targetModel,
        message: `Error saat menghubungi Ollama untuk push: ${err.message}`,
      };
    }
  });

export const exportModelfile = os
  .input(exportModelfileInputSchema)
  .handler(async ({ input }) => {
    try {
      const res = await fetch("http://localhost:11434/api/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: input.modelName, verbose: true }),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.modelfile) {
          return {
            success: true,
            modelName: input.modelName,
            modelfile: data.modelfile,
            system: data.system || "",
            parameters: data.parameters || "",
          };
        }
      }
      return {
        success: false,
        modelName: input.modelName,
        modelfile: "",
        message: "Modelfile tidak ditemukan di Ollama",
      };
    } catch (err: any) {
      return {
        success: false,
        modelName: input.modelName,
        modelfile: "",
        message: err.message || "Gagal membaca Modelfile dari Ollama",
      };
    }
  });

export const saveModelfileToDisk = os
  .use(ipcContext.mainWindowContext)
  .input(saveModelfileToDiskInputSchema)
  .handler(async ({ input, context }) => {
    const { window } = context;
    const cleanName = input.modelName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const result = await dialog.showSaveDialog(window, {
      title: "Simpan Modelfile ER-AI",
      defaultPath: `${cleanName}.Modelfile`,
      filters: [{ name: "Modelfile", extensions: ["Modelfile", "txt"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: null, message: "Penyimpanan dibatalkan." };
    }

    try {
      await fs.writeFile(result.filePath, input.content, "utf-8");
      return {
        canceled: false,
        filePath: result.filePath,
        message: `Modelfile berhasil disimpan ke: ${result.filePath}`,
      };
    } catch (err: any) {
      return {
        canceled: false,
        filePath: null,
        message: `Gagal menyimpan file: ${err.message}`,
      };
    }
  });

export function computeNextErAiVersion(
  existingNames: string[],
  prefix: string = "er-ai-code"
): string {
  let highestMajor = 1;
  let highestMinor = -1;

  const regex =
    prefix === "er-ai-code"
      ? /^(?:er-ai-code|er-ai):v?(\d+)\.(\d+)$/i
      : new RegExp(`^${prefix}:v?(\\d+)\\.(\\d+)$`, "i");

  for (const name of existingNames) {
    if (!name) continue;
    const match = name.match(regex);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major > highestMajor || (major === highestMajor && minor > highestMinor)) {
        highestMajor = major;
        highestMinor = minor;
      }
    }
  }

  if (highestMinor === -1) {
    return `${prefix}:v1.0`;
  }

  return `${prefix}:v${highestMajor}.${highestMinor + 1}`;
}

export function getLatestErAiVersion(
  existingNames: string[],
  prefix: string = "er-ai-code"
): string | null {
  let highestMajor = -1;
  let highestMinor = -1;
  let foundModel: string | null = null;

  const regex =
    prefix === "er-ai-code"
      ? /^(?:er-ai-code|er-ai):v?(\d+)\.(\d+)$/i
      : new RegExp(`^${prefix}:v?(\\d+)\\.(\\d+)$`, "i");

  for (const name of existingNames) {
    if (!name) continue;
    const match = name.match(regex);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major > highestMajor || (major === highestMajor && minor > highestMinor)) {
        highestMajor = major;
        highestMinor = minor;
        foundModel = name.startsWith("er-ai-code")
          ? `er-ai-code:v${major}.${minor}`
          : name;
      }
    }
  }

  if (foundModel) return foundModel;
  if (prefix === "er-ai-code") {
    if (existingNames.includes("er-ai-code:latest")) return "er-ai-code:latest";
    if (existingNames.includes("er-ai-code")) return "er-ai-code";
    if (existingNames.includes("er-ai:latest")) return "er-ai:latest";
    if (existingNames.includes("er-ai")) return "er-ai";
  } else {
    if (existingNames.includes(`${prefix}:latest`)) return `${prefix}:latest`;
    if (existingNames.includes(prefix)) return prefix;
  }
  return null;
}

export async function cleanupOldErAiModels(keepModelName: string): Promise<string[]> {
  const deleted: string[] = [];
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (!res.ok) return deleted;
    const data = (await res.json()) as { models?: Array<{ name: string; model?: string }> };
    const models = data.models || [];

    const targetPrefix = keepModelName.includes(":") ? keepModelName.split(":")[0] : keepModelName;

    for (const item of models) {
      const name = item.name || item.model || "";
      if (!name || name === keepModelName) continue;

      let isOldTarget = false;
      if (targetPrefix === "er-ai-code" || targetPrefix === "er-ai") {
        isOldTarget =
          name === "er-ai-code" ||
          name === "er-ai-code:latest" ||
          name.startsWith("er-ai-code:") ||
          name === "er-ai" ||
          name === "er-ai:latest" ||
          /^er-ai:v\d+\.\d+$/i.test(name);
      } else {
        isOldTarget = name === targetPrefix || name.startsWith(`${targetPrefix}:`);
      }

      // Explicitly protect other dedicated ER-AI families:
      const protectedFamilies = ["er-ai-assistant", "er-ai-vision", "er-ai-think"];
      const isProtectedFamily = protectedFamilies.some(
        (pf) => pf !== targetPrefix && (name === pf || name.startsWith(`${pf}:`))
      );
      if (isProtectedFamily) {
        continue;
      }

      if (isOldTarget) {
        try {
          const delRes = await fetch("http://localhost:11434/api/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: name }),
          });
          if (delRes.ok) {
            deleted.push(name);
          }
        } catch {
          // ignore error per model
        }
      }
    }
  } catch {
    // ignore
  }
  return deleted;
}

export const getModelInfo = os
  .input(getModelInfoInputSchema)
  .handler(async ({ input }) => {
    try {
      const res = await fetch("http://localhost:11434/api/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: input.modelName }),
      });

      if (!res.ok) {
        return {
          success: false,
          model: input.modelName,
          system: "",
          parameters: "",
          hasExistingKnowledge: false,
          message: `Gagal membaca informasi model (HTTP ${res.status})`,
        };
      }

      const data = (await res.json()) as {
        system?: string;
        parameters?: string;
        details?: { parent_model?: string; parameter_size?: string };
        modified_at?: string;
      };

      const systemPrompt = (data.system || "").trim();

      return {
        success: true,
        model: input.modelName,
        system: systemPrompt,
        parameters: data.parameters || "",
        parentModel: data.details?.parent_model || "",
        hasExistingKnowledge: Boolean(systemPrompt.length > 0),
        modifiedAt: data.modified_at || "",
      };
    } catch (err: any) {
      return {
        success: false,
        model: input.modelName,
        system: "",
        parameters: "",
        hasExistingKnowledge: false,
        message: err.message || "Gagal menghubungi Ollama",
      };
    }
  });

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scanDirectory(
  dir: string,
  rootDir: string,
  depth = 0,
  maxDepth = 2
): Promise<string[]> {
  if (depth > maxDepth) return [];

  const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    "vendor",
    "dist",
    "build",
    ".next",
    ".cache",
    ".output",
    "storage",
    "coverage",
    ".vscode",
    ".idea",
  ]);

  const results: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
      if (IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        results.push(`${relativePath}/`);
        const subResults = await scanDirectory(
          fullPath,
          rootDir,
          depth + 1,
          maxDepth
        );
        results.push(...subResults);
      } else {
        results.push(relativePath);
      }
    }
  } catch {
    // Ignore inaccessible dirs
  }

  return results;
}

export async function analyzeProjectDirectory(
  rootPath: string
): Promise<ProjectAnalysis> {
  const projectName = path.basename(rootPath);
  const techStack: Set<string> = new Set();
  const frameworks: Set<string> = new Set();
  const keyFiles: Array<{ name: string; path: string; description: string }> =
    [];
  let packageInfo: ProjectAnalysis["packageInfo"] = undefined;

  // Check package.json (Node.js ecosystem)
  const pkgJsonPath = path.join(rootPath, "package.json");
  const pkgContent = await safeReadFile(pkgJsonPath);
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      techStack.add("JavaScript / Node.js");
      packageInfo = {
        scripts: pkg.scripts,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies,
      };

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      if (allDeps.react) frameworks.add("React");
      if (allDeps["next"]) frameworks.add("Next.js");
      if (allDeps["vue"]) frameworks.add("Vue");
      if (allDeps["nuxt"]) frameworks.add("Nuxt");
      if (allDeps["svelte"]) frameworks.add("Svelte");
      if (allDeps["electron"]) frameworks.add("Electron");
      if (allDeps["express"]) frameworks.add("Express");
      if (allDeps["fastify"]) frameworks.add("Fastify");
      if (allDeps["@nestjs/core"]) frameworks.add("NestJS");
      if (allDeps["tailwindcss"]) frameworks.add("Tailwind CSS");
      if (allDeps["prisma"]) frameworks.add("Prisma ORM");
      if (allDeps["drizzle-orm"]) frameworks.add("Drizzle ORM");
      if (allDeps["typescript"]) techStack.add("TypeScript");

      keyFiles.push({
        name: "package.json",
        path: "package.json",
        description: "Definisi dependensi & skrip Node.js",
      });
    } catch {
      // ignore parse error
    }
  }

  // Check composer.json (PHP / Laravel)
  const composerPath = path.join(rootPath, "composer.json");
  const compContent = await safeReadFile(composerPath);
  if (compContent) {
    try {
      const comp = JSON.parse(compContent);
      techStack.add("PHP");
      const allReqs = { ...(comp.require || {}), ...(comp["require-dev"] || {}) };

      if (allReqs["laravel/framework"]) frameworks.add("Laravel");
      if (allReqs["symfony/framework-bundle"]) frameworks.add("Symfony");
      if (allReqs["livewire/livewire"]) frameworks.add("Livewire");
      if (allReqs["filament/filament"]) frameworks.add("Filament");
      if (allReqs["inertiajs/inertia-laravel"]) frameworks.add("Inertia.js");

      keyFiles.push({
        name: "composer.json",
        path: "composer.json",
        description: "Definisi paket PHP Composer",
      });
    } catch {
      // ignore parse error
    }
  }

  // Check TypeScript
  if (await fileExists(path.join(rootPath, "tsconfig.json"))) {
    techStack.add("TypeScript");
    keyFiles.push({
      name: "tsconfig.json",
      path: "tsconfig.json",
      description: "Konfigurasi kompilator TypeScript",
    });
  }

  // Check Tailwind
  for (const twFile of [
    "tailwind.config.js",
    "tailwind.config.ts",
    "tailwind.config.mjs",
  ]) {
    if (await fileExists(path.join(rootPath, twFile))) {
      frameworks.add("Tailwind CSS");
      keyFiles.push({
        name: twFile,
        path: twFile,
        description: "Konfigurasi styling Tailwind CSS",
      });
      break;
    }
  }

  // Check Database / Docker
  if (await fileExists(path.join(rootPath, "docker-compose.yml"))) {
    keyFiles.push({
      name: "docker-compose.yml",
      path: "docker-compose.yml",
      description: "Layanan container Docker",
    });
  }

  // Scan directory tree
  const allFiles = await scanDirectory(rootPath, rootPath, 0, 2);
  const folderTree = allFiles.slice(0, 40);

  const stackArr = Array.from(techStack);
  const frameworkArr = Array.from(frameworks);

  // Build suggested prompt
  const suggestedPrompt = `Kamu adalah ER-AI Code, asisten koding khusus dan software engineer spesialis untuk proyek "${projectName}".

PENGETAHUAN ARSITEKTUR PROYEK:
- Nama Proyek: ${projectName}
- Lokasi Direktori: ${rootPath}
- Teknologi Utama: ${stackArr.length > 0 ? stackArr.join(", ") : "General Project"}
- Framework & Library: ${frameworkArr.length > 0 ? frameworkArr.join(", ") : "Standard Stack"}

STRUKTUR UTAMA PROYEK:
${folderTree.slice(0, 18).map((f) => `  - ${f}`).join("\n")}

ATURAN KODING & STANDAR PROYEK:
1. Terapkan Clean Code, konsisten dengan struktur folder dan penamaan yang sudah ada di proyek ini.
2. Jika menggunakan TypeScript, selalu terapkan type-safety yang ketat (hindari tipe 'any').
3. Berikan kode lengkap yang langsung dapat diuji/dijalankan tanpa pengantar bertele-tele.
4. Gunakan Bahasa Indonesia yang santai, jelas, dan profesional.
5. Bila memodifikasi fitur, pastikan tidak merusak fungsi yang sudah berjalan di modul terkait.`;

  return {
    name: projectName,
    path: rootPath,
    techStack: stackArr,
    frameworks: frameworkArr,
    summary: `Proyek ${projectName} dengan stack ${stackArr.join("/")} (${frameworkArr.join(", ") || "Vanilla"})`,
    folderTree,
    keyFiles,
    packageInfo,
    suggestedPrompt,
  };
}

export const scanProject = os
  .input(scanProjectInputSchema)
  .handler(async ({ input }): Promise<ProjectAnalysis> => {
    return await analyzeProjectDirectory(input.projectPath);
  });

export const trainModel = os
  .input(trainModelInputSchema)
  .handler(async ({ input }) => {
    const {
      newModelName,
      baseModel,
      systemPrompt,
      temperature,
      contextLength,
      saveLocalModelfile,
      projectPath,
    } = input;

    // 1. Build modelfile content
    const modelfileContent = `FROM ${baseModel}

PARAMETER temperature ${temperature}
PARAMETER top_p 0.85
PARAMETER num_ctx ${contextLength}

SYSTEM """
${systemPrompt.trim()}
"""
`;

    // 2. Training is strictly READ-ONLY on project directory
    // Project files are never modified or created to ensure zero interference with existing codebase agent configurations.

    // 3. Call Ollama API /api/create with structured fields
    try {
      const response = await fetch("http://localhost:11434/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: newModelName,
          from: baseModel,
          system: systemPrompt.trim(),
          parameters: {
            temperature,
            top_p: 0.85,
            num_ctx: contextLength,
          },
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Gagal membuat model di Ollama (HTTP ${response.status}): ${errorText}`,
        };
      }

      if (newModelName.startsWith("er-ai:") || newModelName.startsWith("er-ai-")) {
        await cleanupOldErAiModels(newModelName);
      }

      return {
        success: true,
        message: `Model "${newModelName}" berhasil dilatih dan disimpan ke Ollama!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error saat menghubungkan ke Ollama: ${err.message}`,
      };
    }
  });

export const saveProjectRules = os
  .input(saveProjectRulesInputSchema)
  .handler(async ({ input }) => {
    try {
      const targetPath = path.join(input.projectPath, "AGENTS.md");
      await fs.writeFile(targetPath, input.rulesContent, "utf-8");
      return {
        success: true,
        path: targetPath,
        message: `Berhasil menyimpan instruksi pengetahuan ke ${targetPath}`,
      };
    } catch (err: any) {
      return {
        success: false,
        path: "",
        message: `Gagal menulis AGENTS.md: ${err.message}` ,
      };
    }
  });

export const testModel = os
  .input(testModelInputSchema)
  .handler(async ({ input }) => {
    const startTime = Date.now();
    const prompt =
      input.testPrompt ||
      "Halo ER-AI! Jelaskan secara singkat siapa kamu, pemahamanmu tentang proyek ini, dan aturan koding utama yang harus dipatuhi.";

    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: input.modelName,
          prompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          model: input.modelName,
          prompt,
          response: "",
          error: `Gagal memanggil model (HTTP ${res.status}): ${errorText}`,
          durationMs: Date.now() - startTime,
          tokensPerSec: 0,
          evalCount: 0,
          checks: {
            modelLoaded: false,
            answeredPersona: false,
            hasResponse: false,
          },
        };
      }

      const data = (await res.json()) as {
        response: string;
        total_duration?: number;
        eval_count?: number;
        eval_duration?: number;
      };

      const evalCount = data.eval_count || 0;
      const evalDurationSec = (data.eval_duration || 1) / 1e9;
      const tokensPerSec =
        evalDurationSec > 0 ? Math.round(evalCount / evalDurationSec) : 0;
      const totalDurationMs = data.total_duration
        ? Math.round(data.total_duration / 1e6)
        : Date.now() - startTime;

      const lower = (data.response || "").toLowerCase();
      const checks = {
        modelLoaded: true,
        answeredPersona:
          lower.includes("er-ai") ||
          lower.includes("asisten") ||
          lower.includes("proyek") ||
          lower.includes("koding"),
        hasResponse: (data.response || "").trim().length > 0,
      };

      return {
        success: true,
        model: input.modelName,
        prompt,
        response: (data.response || "").trim(),
        durationMs: totalDurationMs,
        tokensPerSec,
        evalCount,
        checks,
      };
    } catch (err: any) {
      return {
        success: false,
        model: input.modelName,
        prompt,
        response: "",
        error: err.message || "Gagal menghubungkan ke model Ollama",
        durationMs: Date.now() - startTime,
        tokensPerSec: 0,
        evalCount: 0,
        checks: {
          modelLoaded: false,
          answeredPersona: false,
          hasResponse: false,
        },
      };
    }
  });

export const chatWithModel = os
  .input(chatWithModelInputSchema)
  .handler(async ({ input }) => {
    const startTime = Date.now();
    try {
      const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: input.modelName,
          messages: input.messages,
          stream: false,
          options: {
            temperature: input.temperature ?? 0.3,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          message: "",
          model: input.modelName,
          error: `Gagal memanggil model chat (HTTP ${res.status}): ${errorText}`,
          durationMs: Date.now() - startTime,
          tokensPerSec: 0,
          evalCount: 0,
        };
      }

      const data = (await res.json()) as {
        message?: { role: string; content: string };
        total_duration?: number;
        eval_count?: number;
        eval_duration?: number;
      };

      const evalCount = data.eval_count || 0;
      const evalDurationSec = (data.eval_duration || 1) / 1e9;
      const tokensPerSec =
        evalDurationSec > 0 ? Math.round(evalCount / evalDurationSec) : 0;
      const totalDurationMs = data.total_duration
        ? Math.round(data.total_duration / 1e6)
        : Date.now() - startTime;

      return {
        success: true,
        message: data.message?.content || "",
        model: input.modelName,
        durationMs: totalDurationMs,
        tokensPerSec,
        evalCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: "",
        model: input.modelName,
        error: err.message || "Gagal menghubungi Ollama untuk chat",
        durationMs: Date.now() - startTime,
        tokensPerSec: 0,
        evalCount: 0,
      };
    }
  });

export const selectMultipleFolders = os
  .use(ipcContext.mainWindowContext)
  .handler(async ({ context }) => {
    const { window } = context;
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory", "multiSelections"],
      title: "Pilih Satu atau Banyak Folder Proyek untuk ER-AI",
    });

    return {
      canceled: result.canceled,
      paths: result.filePaths || [],
    };
  });

export const getProjectQueue = os.handler(async (): Promise<ProjectRecord[]> => {
  return getAllProjects();
});

export const addProjectsToQueue = os
  .input(addProjectsToQueueInputSchema)
  .handler(async ({ input }): Promise<ProjectRecord[]> => {
    for (const p of input.paths) {
      const resolved = path.resolve(p);
      const existing = getProjectByPath(resolved);
      if (!existing) {
        try {
          const analysis = await analyzeProjectDirectory(resolved);
          upsertProject({
            project_path: resolved,
            project_name: analysis.name,
            tech_stack: analysis.techStack,
            frameworks: analysis.frameworks,
            summary: analysis.summary,
            status: "pending",
          });
        } catch {
          const baseName = path.basename(resolved);
          upsertProject({
            project_path: resolved,
            project_name: baseName,
            status: "pending",
          });
        }
      }
    }
    return getAllProjects();
  });

export const toggleIgnoreProjectHandler = os
  .input(toggleIgnoreProjectInputSchema)
  .handler(async ({ input }): Promise<ProjectRecord[]> => {
    toggleIgnoreInDb(input.projectPath, input.isIgnored);
    return getAllProjects();
  });

export const deleteProjectFromQueueHandler = os
  .input(deleteProjectFromQueueInputSchema)
  .handler(async ({ input }): Promise<ProjectRecord[]> => {
    deleteProjectFromDb(input.projectPath);
    return getAllProjects();
  });

export const processSingleProjectTraining = os
  .input(processSingleProjectTrainingInputSchema)
  .handler(async ({ input }) => {
    const startTime = Date.now();
    const resolvedPath = path.resolve(input.projectPath);
    const existing = getProjectByPath(resolvedPath);

    // 1. Mark as training in SQLite
    upsertProject({
      project_path: resolvedPath,
      project_name: existing?.project_name || path.basename(resolvedPath),
      status: "training",
    });

    try {
      // Fetch available models from Ollama
      let availableOllamaModels: string[] = [];
      try {
        const tagsRes = await fetch("http://localhost:11434/api/tags");
        if (tagsRes.ok) {
          const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> };
          availableOllamaModels = (tagsData.models || []).map((m) => m.name);
        }
      } catch {}

      // Calculate targetModelName: increment version (e.g. er-ai-code:v1.0 -> er-ai-code:v1.1)
      let targetModelName = input.targetModelName?.trim();
      if (
        !targetModelName ||
        targetModelName === "er-ai:latest" ||
        targetModelName === "er-ai" ||
        targetModelName === "er-ai-code:latest" ||
        targetModelName === "er-ai-code" ||
        targetModelName === "er-ai:v1.0"
      ) {
        const allKnownNames = [...availableOllamaModels];
        try {
          const dbProjects = getAllProjects();
          dbProjects.forEach((p) => {
            if (p.target_model_name) allKnownNames.push(p.target_model_name);
          });
        } catch {}
        targetModelName = computeNextErAiVersion(allKnownNames, "er-ai-code");
      }

      // Determine effective base model
      let effectiveBaseModel = input.baseModel?.trim();
      if (!effectiveBaseModel || !availableOllamaModels.includes(effectiveBaseModel)) {
        const latestErAi = getLatestErAiVersion(availableOllamaModels);
        if (latestErAi && availableOllamaModels.includes(latestErAi)) {
          effectiveBaseModel = latestErAi;
        } else {
          const fallback =
            availableOllamaModels.find(
              (m) =>
                m.includes("coder") ||
                m.includes("qwen") ||
                m.includes("deepseek") ||
                m.includes("llama")
            ) || availableOllamaModels[0] || "qwen2.5-coder:3b";
          effectiveBaseModel = fallback;
        }
      }

      // 2. Analyze project
      const analysis = await analyzeProjectDirectory(resolvedPath);

      // 3. Fetch personal habits from effectiveBaseModel
      let personalHabits = "";
      try {
        const infoRes = await fetch("http://localhost:11434/api/show", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: effectiveBaseModel }),
        });
        if (infoRes.ok) {
          const infoData = (await infoRes.json()) as any;
          if (infoData.system) personalHabits = infoData.system.trim();
        }
      } catch {
        // ignore
      }

      // 4. Synthesize system prompt
      let systemPrompt = input.customSystemPrompt;
      if (!systemPrompt || !systemPrompt.trim()) {
        const habitsHeader = personalHabits
          ? `// ============================================\n// ATURAN & KEBIASAAN KODING PRIBADI ANDA:\n// (Tercatat dari model: ${effectiveBaseModel})\n// ============================================\n${personalHabits}\n\n`
          : "";

        systemPrompt = `${habitsHeader}// ============================================\n// PENGETAHUAN ARSITEKTUR PROYEK SPESIFIK:\n// ============================================\nKamu adalah ER-AI, asisten koding khusus untuk proyek "${analysis.name}".\n\nPENGETAHUAN ARSITEKTUR PROYEK:\n- Nama Proyek: ${analysis.name}\n- Lokasi Direktori: ${analysis.path}\n- Teknologi: ${analysis.techStack.join(", ") || "Umum"}\n- Framework: ${analysis.frameworks.join(", ") || "Standard"}\n\nSTRUKTUR UTAMA PROYEK:\n${analysis.folderTree.slice(0, 20).map((f) => `  - ${f}`).join("\n")}\n\nATURAN KODING & STANDAR:\n1. Terapkan Clean Code, konsisten dengan struktur folder dan penamaan yang sudah ada.\n2. Jika menggunakan TypeScript, selalu terapkan type-safety yang ketat (hindari tipe 'any').\n3. Berikan kode lengkap yang langsung dapat diuji/dijalankan tanpa pengantar bertele-tele.\n4. Gunakan Bahasa Indonesia yang santai, jelas, dan profesional.\n5. Pastikan perubahan tidak merusak fungsi yang sudah berjalan di modul terkait.`;
      }

      // 5. Scanned project directory is strictly READ-ONLY (no files are modified or written)

      // 6. Call Ollama /api/create
      const createRes = await fetch("http://localhost:11434/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModelName,
          from: effectiveBaseModel,
          system: systemPrompt.trim(),
          parameters: {
            temperature: input.temperature,
            top_p: 0.85,
            num_ctx: input.contextLength,
          },
          stream: false,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(
          `Gagal melatih di Ollama (HTTP ${createRes.status}): ${errText}`
        );
      }

      // 6b. Automatically clean up older er-ai models & old project models (keep only targetModelName)
      const deletedModels = await cleanupOldErAiModels(targetModelName);

      // 7. Generate in-depth AI Analysis Report
      let aiAnalysisText = "";
      let tokensPerSec = 0;
      let evalCount = 0;

      const analysisPrompt = `Kamu adalah pakar arsitektur software senior. Analisis proyek "${analysis.name}" berdasarkan metadata berikut:\n- Direktori: ${resolvedPath}\n- Tech Stack: ${analysis.techStack.join(", ")}\n- Framework & Library: ${analysis.frameworks.join(", ")}\n- Struktur Direktori:\n${analysis.folderTree.slice(0, 20).join("\n")}\n\nBerikan laporan analisa komprehensif dalam Bahasa Indonesia mencakup:\n### 1. Evaluasi Arsitektur & Pola Desain\n(Analisis modularitas, pemisahan layer, dan kerapian struktur folder)\n\n### 2. Potensi Risiko & Area Optimasi\n(Sebutkan potensi bottleneck performa, keamanan, atau dependensi)\n\n### 3. Rekomendasi Standar Koding Khusus Proyek untuk AI Agent\n(3-5 pedoman spesifik agar AI koding konsisten dengan proyek ini)`;

      if (input.analysisEngine === "opencode") {
        const bin = getOpenCodeBin();
        if (bin) {
          try {
            const opencodeRes = await executeOpenCode(
              bin,
              input.opencodeModel || "opencode/nemotron-3.5-lightning-free",
              analysisPrompt,
              resolvedPath
            );
            aiAnalysisText = opencodeRes.text;
            tokensPerSec = Math.round(
              (aiAnalysisText.length / 4) / Math.max(0.5, opencodeRes.durationMs / 1000)
            );
          } catch (opErr: any) {
            aiAnalysisText = `[OpenCode Analisa Terlewat: ${opErr.message}]`;
          }
        }
      } else {
        try {
          const generateRes = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: targetModelName,
              prompt: analysisPrompt,
              stream: false,
            }),
          });

          if (generateRes.ok) {
            const genData = (await generateRes.json()) as any;
            aiAnalysisText = (genData.response || "").trim();
            evalCount = genData.eval_count || 0;
            const evalDurationSec = (genData.eval_duration || 1) / 1e9;
            tokensPerSec =
              evalDurationSec > 0 ? Math.round(evalCount / evalDurationSec) : 0;
          }
        } catch (genErr: any) {
          aiAnalysisText = `[Model berhasil dilatih, namun analisa otomatis terlewat: ${genErr.message}]`;
        }
      }

      const totalDuration = Date.now() - startTime;
      const now = new Date().toISOString();

      // 8. Update SQLite with training status, AI analysis, metrics
      const updated = upsertProject({
        project_path: resolvedPath,
        project_name: analysis.name,
        target_model_name: targetModelName,
        base_model: effectiveBaseModel,
        status: "completed",
        tech_stack: analysis.techStack,
        frameworks: analysis.frameworks,
        summary: analysis.summary,
        system_prompt: systemPrompt,
        ai_analysis: aiAnalysisText,
        tokens_per_sec: tokensPerSec,
        duration_ms: totalDuration,
        trained_at: now,
      });

      return {
        success: true,
        project: updated,
        aiAnalysis: aiAnalysisText,
        tokensPerSec,
        durationMs: totalDuration,
        deletedModels,
        message: `Proyek "${analysis.name}" berhasil dilatih menjadi model "${targetModelName}"!${deletedModels.length > 0 ? ` (Model lama dibersihkan: ${deletedModels.join(", ")})` : ""}`,
      };
    } catch (err: any) {
      upsertProject({
        project_path: resolvedPath,
        project_name: existing?.project_name || path.basename(resolvedPath),
        status: "failed",
      });
      return {
        success: false,
        project: getProjectByPath(resolvedPath),
        aiAnalysis: "",
        tokensPerSec: 0,
        durationMs: Date.now() - startTime,
        deletedModels: [],
        message: err.message,
      };
    }
  });
