import fs from "node:fs/promises";
import path from "node:path";
import { os } from "@orpc/server";
import { dialog } from "electron";
import { ipcContext } from "../context";
import {
  saveProjectRulesInputSchema,
  scanProjectInputSchema,
  trainModelInputSchema,
} from "./schemas";

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

export const scanProject = os
  .input(scanProjectInputSchema)
  .handler(async ({ input }): Promise<ProjectAnalysis> => {
    const rootPath = path.resolve(input.projectPath);
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

    // 3. Call Ollama API /api/create
    try {
      const response = await fetch("http://localhost:11434/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: newModelName,
          modelfile: modelfileContent,
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
