import fs from "node:fs/promises";
import path from "node:path";
import { os } from "@orpc/server";
import { dialog } from "electron";
import { ipcContext } from "../context";
import {
  addProjectsToQueueInputSchema,
  deleteProjectFromQueueInputSchema,
  getModelInfoInputSchema,
  processSingleProjectTrainingInputSchema,
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
    return {
      online: true,
      models: data.models || [],
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
  baseDir: string,
  depth = 0,
  maxDepth = 2
): Promise<string[]> {
  if (depth > maxDepth) return [];
  const entries: string[] = [];

  const ignoreDirs = new Set([
    "node_modules",
    "vendor",
    ".git",
    "dist",
    ".next",
    ".vite",
    "build",
    "out",
    "storage",
    ".cache",
    ".idea",
    ".vscode",
  ]);

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith(".") && item.name !== ".env.example") continue;
      const relative = path.relative(baseDir, path.join(dir, item.name));

      if (item.isDirectory()) {
        if (ignoreDirs.has(item.name)) continue;
        entries.push(`${relative}/`);
        const sub = await scanDirectory(
          path.join(dir, item.name),
          baseDir,
          depth + 1,
          maxDepth
        );
        entries.push(...sub);
      } else {
        entries.push(relative);
      }
    }
  } catch {
    // Ignore read errors
  }

  return entries;
}

export async function analyzeProjectDirectory(dirPath: string): Promise<ProjectAnalysis> {
  const rootPath = path.resolve(dirPath);
    let projectName = path.basename(rootPath);
    const techStack = new Set<string>();
    const frameworks = new Set<string>();
    const keyFiles: Array<{ name: string; path: string; description: string }> =
      [];
    let packageInfo: any = null;

    // Check package.json
    const pkgJsonRaw = await safeReadFile(path.join(rootPath, "package.json"));
    if (pkgJsonRaw) {
      try {
        const pkg = JSON.parse(pkgJsonRaw);
        if (pkg.name) projectName = pkg.name;
        packageInfo = {
          scripts: pkg.scripts,
          dependencies: pkg.dependencies,
          devDependencies: pkg.devDependencies,
        };
        techStack.add("Node.js / JavaScript");

        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };

        if (allDeps.typescript) techStack.add("TypeScript");
        if (allDeps.react) frameworks.add("React");
        if (allDeps.next) frameworks.add("Next.js");
        if (allDeps.vue) frameworks.add("Vue");
        if (allDeps.vite) frameworks.add("Vite");
        if (allDeps.electron) frameworks.add("Electron");
        if (allDeps.tailwindcss) frameworks.add("Tailwind CSS");
        if (allDeps.express) frameworks.add("Express");
        if (allDeps.prisma) frameworks.add("Prisma ORM");
        if (allDeps.drizzle) frameworks.add("Drizzle ORM");
        if (allDeps.vitest) frameworks.add("Vitest");
        if (allDeps.jest) frameworks.add("Jest");

        keyFiles.push({
          name: "package.json",
          path: "package.json",
          description: "Definisi paket npm dan scripts",
        });
      } catch {
        // ignore parse error
      }
    }

    // Check composer.json
    const composerRaw = await safeReadFile(
      path.join(rootPath, "composer.json")
    );
    if (composerRaw) {
      try {
        const composer = JSON.parse(composerRaw);
        techStack.add("PHP");
        const allReqs = { ...composer.require, ...composer["require-dev"] };
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
    const suggestedPrompt = `Kamu adalah ER-AI, asisten koding khusus untuk proyek "${projectName}".

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

    // 2. Optionally write local Modelfile in the project root
    if (saveLocalModelfile && projectPath) {
      try {
        const targetPath = path.join(projectPath, "Modelfile.er-ai");
        await fs.writeFile(targetPath, modelfileContent, "utf-8");
      } catch {
        // ignore file write error
      }
    }

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
        message: `Gagal menulis AGENTS.md: ${err.message}`,
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
          modelName: input.modelName,
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
        modelName: input.modelName,
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
        modelName: input.modelName,
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
      // 2. Analyze project
      const analysis = await analyzeProjectDirectory(resolvedPath);
      const cleanName = analysis.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .slice(0, 24);
      const targetModelName = `er-ai-${cleanName}`;

      // 3. Fetch personal habits from baseModel
      let personalHabits = "";
      try {
        const infoRes = await fetch("http://localhost:11434/api/show", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: input.baseModel }),
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
          ? `// ============================================\n// ATURAN & KEBIASAAN KODING PRIBADI ANDA:\n// (Tercatat dari model: ${input.baseModel})\n// ============================================\n${personalHabits}\n\n`
          : "";

        systemPrompt = `${habitsHeader}// ============================================
// PENGETAHUAN ARSITEKTUR PROYEK SPESIFIK:
// ============================================
Kamu adalah ER-AI, asisten koding khusus untuk proyek "${analysis.name}".

PENGETAHUAN ARSITEKTUR PROYEK:
- Nama Proyek: ${analysis.name}
- Lokasi Direktori: ${analysis.path}
- Teknologi: ${analysis.techStack.join(", ") || "Umum"}
- Framework: ${analysis.frameworks.join(", ") || "Standard"}

STRUKTUR UTAMA PROYEK:
${analysis.folderTree.slice(0, 20).map((f) => `  - ${f}`).join("\n")}

ATURAN KODING & STANDAR:
1. Terapkan Clean Code, konsisten dengan struktur folder dan penamaan yang sudah ada.
2. Jika menggunakan TypeScript, selalu terapkan type-safety yang ketat (hindari tipe 'any').
3. Berikan kode lengkap yang langsung dapat diuji/dijalankan tanpa pengantar bertele-tele.
4. Gunakan Bahasa Indonesia yang santai, jelas, dan profesional.
5. Pastikan perubahan tidak merusak fungsi yang sudah berjalan di modul terkait.`;
      }

      // 5. Save AGENTS.md and Modelfile locally
      try {
        await fs.writeFile(
          path.join(resolvedPath, "AGENTS.md"),
          systemPrompt,
          "utf-8"
        );
        const modelfile = `FROM ${input.baseModel}\nPARAMETER temperature ${input.temperature}\nPARAMETER top_p 0.85\nPARAMETER num_ctx ${input.contextLength}\nSYSTEM """\n${systemPrompt.trim()}\n"""\n`;
        await fs.writeFile(
          path.join(resolvedPath, "Modelfile.er-ai"),
          modelfile,
          "utf-8"
        );
      } catch {
        // ignore file write errors
      }

      // 6. Call Ollama /api/create
      const createRes = await fetch("http://localhost:11434/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModelName,
          from: input.baseModel,
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

      // 7. Generate in-depth AI Analysis Report
      let aiAnalysisText = "";
      let tokensPerSec = 0;
      let evalCount = 0;

      const analysisPrompt = `Kamu adalah pakar arsitektur software senior. Analisis proyek "${analysis.name}" berdasarkan metadata berikut:
- Direktori: ${resolvedPath}
- Tech Stack: ${analysis.techStack.join(", ")}
- Framework & Library: ${analysis.frameworks.join(", ")}
- Struktur Direktori:
${analysis.folderTree.slice(0, 20).join("\n")}

Berikan laporan analisa komprehensif dalam Bahasa Indonesia mencakup:
### 1. Evaluasi Arsitektur & Pola Desain
(Analisis modularitas, pemisahan layer, dan kerapian struktur folder)

### 2. Potensi Risiko & Area Optimasi
(Sebutkan potensi bottleneck performa, keamanan, atau dependensi)

### 3. Rekomendasi Standar Koding Khusus Proyek untuk AI Agent
(3-5 pedoman spesifik agar AI koding konsisten dengan proyek ini)`;

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

      const totalDuration = Date.now() - startTime;
      const now = new Date().toISOString();

      // 8. Update SQLite with training status, AI analysis, metrics
      const updated = upsertProject({
        project_path: resolvedPath,
        project_name: analysis.name,
        target_model_name: targetModelName,
        base_model: input.baseModel,
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
        message: `Proyek "${analysis.name}" berhasil dilatih dan dianalisis oleh AI!`,
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
        message: err.message,
      };
    }
  });
