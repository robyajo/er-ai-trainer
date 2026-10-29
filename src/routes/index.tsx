import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FolderOpen,
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  FileCode,
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Save,
  Rocket,
  Code2,
  Bug,
  Layout,
  Database,
  Info,
} from "lucide-react";
import {
  getOllamaModels,
  saveProjectRules,
  scanProject,
  selectFolder,
  trainModel,
} from "@/actions/trainer";
import type { ProjectAnalysis } from "@/ipc/trainer/handlers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ToggleTheme from "@/components/toggle-theme";

interface TemplateItem {
  id: string;
  name: string;
  icon: any;
  description: string;
  generate: (analysis: ProjectAnalysis) => string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "fullstack",
    name: "Arsitektur & Konvensi",
    icon: Layers,
    description: "Memahami struktur direktori, data flow, dan konvensi proyek.",
    generate: (p) => `Kamu adalah ER-AI, asisten koding khusus untuk proyek "${p.name}".

PENGETAHUAN ARSITEKTUR PROYEK:
- Nama Proyek: ${p.name}
- Lokasi Direktori: ${p.path}
- Teknologi: ${p.techStack.join(", ") || "General"}
- Framework & Library: ${p.frameworks.join(", ") || "Standard"}

STRUKTUR UTAMA PROYEK:
${p.folderTree.slice(0, 20).map((f) => `  - ${f}`).join("\n")}

ATURAN KODING & STANDAR:
1. Terapkan Clean Code, konsisten dengan struktur folder dan penamaan yang sudah ada di proyek ini.
2. Jika menggunakan TypeScript, selalu terapkan type-safety yang ketat (hindari tipe 'any').
3. Berikan kode lengkap yang langsung dapat diuji/dijalankan tanpa pengantar bertele-tele.
4. Gunakan Bahasa Indonesia yang santai, jelas, dan profesional.
5. Bila memodifikasi fitur, pastikan tidak merusak fungsi yang sudah berjalan di modul terkait.`,
  },
  {
    id: "cleancode",
    name: "Clean Code & Type Safety",
    icon: ShieldCheck,
    description: "Fokus pada kode defensif, anti-bug, dan eliminasi tipe 'any'.",
    generate: (p) => `Kamu adalah ER-AI (Clean Code Specialist) untuk proyek "${p.name}".

STANDAR KUALITAS KODE:
1. Strict Type-Safety: Dilarang menggunakan tipe 'any'. Selalu definisikan interface/type eksplisit.
2. Error Handling Defensif: Tangani nilai null/undefined, network error, dan try-catch pada operasi async.
3. DRY (Don't Repeat Yourself) & Single Responsibility: Pisahkan logika bisnis ke dalam service/hook khusus.
4. Kinerja & Memori: Hindari memory leak, unsubscribe listener/event saat component unmount.
5. Gunakan Bahasa Indonesia yang santai dan to-the-point dalam menjelaskan kode.`,
  },
  {
    id: "api",
    name: "Backend, DB & API",
    icon: Database,
    description: "Fokus pada request validation, skema database, dan endpoint controller.",
    generate: (p) => `Kamu adalah ER-AI (Backend & Database Specialist) untuk proyek "${p.name}".

PEDOMAN BACKEND & DATABASE:
1. Skema & Model: Ikuti struktur schema database (MariaDB/MySQL/PostgreSQL) dan ORM yang digunakan pada proyek ini.
2. Validasi Ketat: Semua input dari client WAJIB divalidasi sebelum diproses ke database.
3. Response Format: Konsisten dalam struktur JSON response (success, data, error, message).
4. Query Optimization: Hindari N+1 query problem, gunakan eager loading atau indexing yang sesuai.
5. Autentikasi & Keamanan: Lindungi endpoint dari SQL Injection, XSS, dan CSRF vulnerability.`,
  },
  {
    id: "ui",
    name: "Frontend & UI/UX",
    icon: Layout,
    description: "Fokus pada Tailwind CSS, komponen reusable, dan responsive design.",
    generate: (p) => `Kamu adalah ER-AI (Frontend & UI Specialist) untuk proyek "${p.name}".

PEDOMAN DESAIN & KOMPONEN:
1. Styling: Gunakan Tailwind CSS secara konsisten dengan palet warna dan styling tokens proyek.
2. Komponen Modular: Buat komponen yang reusable, mudah dibaca, dan modular.
3. Responsiveness & Aksesibilitas: Desain harus ramah di layar mobile dan desktop, serta ramah aksesibilitas (ARIA).
4. State Management: Gunakan React Hooks (useState, useMemo, useCallback) dengan bijak agar tidak re-render berlebihan.
5. Langsung berikan implementasi TSX/JSX yang siap pasang.`,
  },
  {
    id: "testing",
    name: "Testing & Bug Auditor",
    icon: Bug,
    description: "Membuat unit test otomatis dan audit celah bug.",
    generate: (p) => `Kamu adalah ER-AI (QA & Security Auditor) untuk proyek "${p.name}".

STANDAR TESTING & AUDIT:
1. Buat unit test komprehensif menggunakan runner proyek (Vitest / Jest / PHPUnit).
2. Uji skenario positif (happy path) dan skenario negatif (edge cases, invalid input, timeout).
3. Selalu sertakan mock data yang realistis dan bersihkan state setelah testing selesai.
4. Selalu beri catatan di akhir jika kamu menemukan potensi bug tersembunyi atau celah performa pada kode.`,
  },
  {
    id: "custom",
    name: "Custom Manual",
    icon: Code2,
    description: "Instruksi bebas yang dapat Anda tulis dan sesuaikan sendiri.",
    generate: (p) => `Kamu adalah ER-AI, asisten koding pribadi untuk proyek "${p.name}".\n\nTulis instruksi khusus Anda di sini...`,
  },
];

function TrainerPage() {
  const [ollamaStatus, setOllamaStatus] = useState<{
    online: boolean;
    models: Array<{ name: string; size: number }>;
  }>({ online: false, models: [] });

  const [projectPath, setProjectPath] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<ProjectAnalysis | null>(null);

  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("qwen2.5-coder:3b");
  const [targetModelName, setTargetModelName] = useState<string>("er-ai");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("fullstack");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.3);
  const [contextLength, setContextLength] = useState<number>(32768);

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);

  // Fetch Ollama models on mount
  useEffect(() => {
    refreshOllama();
  }, []);

  const refreshOllama = async () => {
    const res = await getOllamaModels();
    setOllamaStatus({
      online: res.online,
      models: res.models || [],
    });
    if (res.models && res.models.length > 0) {
      // Pick er-ai or qwen2.5-coder if available
      const preferred = res.models.find(
        (m) => m.name.includes("er-ai") || m.name.includes("qwen")
      );
      if (preferred) {
        setSelectedBaseModel(preferred.name);
      } else {
        setSelectedBaseModel(res.models[0].name);
      }
    }
  };

  // Handle folder picker
  const handlePickFolder = async () => {
    const res = await selectFolder();
    if (!res.canceled && res.path) {
      setProjectPath(res.path);
      performScan(res.path);
    }
  };

  // Scan project
  const performScan = async (path: string) => {
    setIsScanning(true);
    try {
      const data = await scanProject(path);
      setProjectData(data);
      const safeProjectName = data.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .slice(0, 20);
      setTargetModelName(`er-ai-${safeProjectName}`);

      // Apply current template
      const currentTpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
      setSystemPrompt(currentTpl.generate(data));
      toast.success(`Berhasil menganalisis proyek "${data.name}"!`);
    } catch (err: any) {
      toast.error(`Gagal menganalisis proyek: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Switch template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (projectData) {
      const tpl = TEMPLATES.find((t) => t.id === templateId);
      if (tpl) {
        setSystemPrompt(tpl.generate(projectData));
      }
    }
  };

  // Train / Create Model in Ollama
  const handleTrain = async () => {
    if (!targetModelName.trim()) {
      toast.error("Nama model baru tidak boleh kosong!");
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error("Instruksi sistem tidak boleh kosong!");
      return;
    }

    setIsTraining(true);
    toast.info(`Memulai pembuatan model "${targetModelName}" di Ollama...`);

    try {
      const res = await trainModel({
        newModelName: targetModelName,
        baseModel: selectedBaseModel,
        systemPrompt: systemPrompt,
        temperature,
        contextLength,
        saveLocalModelfile: true,
        projectPath: projectData?.path,
      });

      if (res.success) {
        toast.success(res.message);
        await refreshOllama();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  // Save AGENTS.md to project folder
  const handleSaveAgentsRules = async () => {
    if (!projectData?.path) {
      toast.error("Pilih folder proyek terlebih dahulu!");
      return;
    }

    setIsSavingRules(true);
    try {
      const res = await saveProjectRules(projectData.path, systemPrompt);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSavingRules(false);
    }
  };

  // Copy Modelfile text
  const handleCopyModelfile = () => {
    const content = `FROM ${selectedBaseModel}

PARAMETER temperature ${temperature}
PARAMETER top_p 0.85
PARAMETER num_ctx ${contextLength}

SYSTEM """
${systemPrompt.trim()}
"""`;
    navigator.clipboard.writeText(content);
    toast.success("Isi Modelfile berhasil disalin ke clipboard!");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight">ER-AI Trainer Studio</h1>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                v1.0
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Latih dan transfer pengetahuan proyek Anda ke model lokal ER-AI secara instan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ollama Status Badge */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs">
            <span
              className={`size-2.5 rounded-full ${
                ollamaStatus.online ? "bg-emerald-500 animate-pulse" : "bg-destructive"
              }`}
            />
            <span className="font-medium">
              {ollamaStatus.online
                ? `Ollama Online (${ollamaStatus.models.length} model)`
                : "Ollama Offline"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
              onClick={refreshOllama}
              title="Refresh Ollama"
            >
              <RefreshCw className="size-3" />
            </Button>
          </div>

          <ToggleTheme />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Project Picker & Model Config (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Step 1: Folder Picker */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderOpen className="size-4 text-primary" />
                  1. Pilih Folder Proyek
                </CardTitle>
                {projectData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => performScan(projectPath)}
                    disabled={isScanning}
                  >
                    <RefreshCw className={`size-3 mr-1 ${isScanning ? "animate-spin" : ""}`} />
                    Pindai Ulang
                  </Button>
                )}
              </div>
              <CardDescription>
                Pilih folder repositori proyek yang sudah siap Anda kembangkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Belum ada folder yang dipilih..."
                  value={projectPath}
                  readOnly
                  className="bg-muted/50 font-mono text-xs"
                />
                <Button onClick={handlePickFolder} disabled={isScanning} className="shrink-0 gap-1.5">
                  <FolderOpen className="size-4" />
                  Pilih Folder
                </Button>
              </div>

              {/* Scanned Project Details */}
              {projectData && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{projectData.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {projectData.techStack[0] || "Project"}
                    </Badge>
                  </div>

                  {/* Tech stack badges */}
                  <div className="flex flex-wrap gap-1">
                    {projectData.techStack.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-[11px] py-0">
                        {tech}
                      </Badge>
                    ))}
                    {projectData.frameworks.map((fw) => (
                      <Badge key={fw} className="bg-primary/20 text-primary text-[11px] py-0 hover:bg-primary/30">
                        {fw}
                      </Badge>
                    ))}
                  </div>

                  {/* Scanned Tree Preview */}
                  <div className="border-t pt-2">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Struktur Terdeteksi ({projectData.folderTree.length} item):
                    </p>
                    <div className="max-h-28 overflow-y-auto rounded bg-background/80 p-2 font-mono text-[11px] leading-tight text-muted-foreground">
                      {projectData.folderTree.slice(0, 15).map((f) => (
                        <div key={f} className="truncate">
                          📁 {f}
                        </div>
                      ))}
                      {projectData.folderTree.length > 15 && (
                        <div className="text-xs text-primary/80 pt-1">
                          + {projectData.folderTree.length - 15} file lainnya...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Base Model & Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="size-4 text-primary" />
                2. Pilih Model & Parameter
              </CardTitle>
              <CardDescription>
                Pilih model pondasi dan tentukan nama model baru Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Base Model Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Model Dasar (Base Model):</label>
                <Select value={selectedBaseModel} onValueChange={setSelectedBaseModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih model dasar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ollamaStatus.models.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name} ({(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Rekomendasi: Gunakan <strong>er-ai:latest</strong> atau <strong>qwen2.5-coder:3b</strong> untuk performa optimal.
                </p>
              </div>

              {/* Target Model Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nama Model Baru di Ollama:</label>
                <Input
                  value={targetModelName}
                  onChange={(e) => setTargetModelName(e.target.value)}
                  placeholder="Contoh: er-ai-xphpmyadmin"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Nama ini yang akan muncul di Ollama dan pilihan model editor Zed Anda.
                </p>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Context Window:</label>
                  <Select
                    value={contextLength.toString()}
                    onValueChange={(val) => setContextLength(Number.parseInt(val, 10))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16384">16K (Hemat VRAM)</SelectItem>
                      <SelectItem value="32768">32K (Standar Ideal)</SelectItem>
                      <SelectItem value="65536">64K (Ekstra Panjang)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Temperature:</label>
                  <Select
                    value={temperature.toString()}
                    onValueChange={(val) => setTemperature(Number.parseFloat(val))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.2">0.2 (Sangat Presisi)</SelectItem>
                      <SelectItem value="0.3">0.3 (Optimal Koding)</SelectItem>
                      <SelectItem value="0.5">0.5 (Lebih Kreatif)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Templates, Prompt Editor & Action (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCode className="size-4 text-primary" />
                    3. Template Instruksi & Pengetahuan Proyek
                  </CardTitle>
                  <CardDescription>
                    Pilih preset kebutuhan atau edit langsung instruksi sistem di bawah ini.
                  </CardDescription>
                </div>
              </div>

              {/* Template Selectors */}
              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                {TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "bg-muted/30 hover:bg-muted/70 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium text-xs">
                        <Icon className={`size-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={isSelected ? "text-primary font-semibold" : ""}>{tpl.name}</span>
                      </div>
                      <p className="line-clamp-2 text-[10px] text-muted-foreground leading-snug">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Textarea Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Instruksi Sistem (System Prompt):</label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {systemPrompt.length} karakter (~{Math.round(systemPrompt.length / 4)} token)
                  </span>
                </div>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={
                    projectData
                      ? "Sesuaikan instruksi untuk ER-AI di sini..."
                      : "Pilih folder project Anda di sebelah kiri untuk menghasilkan instruksi otomatis..."
                  }
                  className="min-h-[280px] font-mono text-xs leading-relaxed bg-background/90"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyModelfile}
                    className="text-xs gap-1.5"
                    title="Salin Modelfile lengkap"
                  >
                    <Copy className="size-3.5" />
                    Salin Modelfile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAgentsRules}
                    disabled={isSavingRules || !projectData}
                    className="text-xs gap-1.5"
                    title="Simpan AGENTS.md langsung ke folder proyek Anda"
                  >
                    <Save className="size-3.5" />
                    Simpan AGENTS.md
                  </Button>
                </div>

                <Button
                  onClick={handleTrain}
                  disabled={isTraining || !systemPrompt.trim()}
                  className="gap-2 bg-primary font-semibold shadow-md hover:bg-primary/90"
                >
                  {isTraining ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Sedang Melatih Model...
                    </>
                  ) : (
                    <>
                      <Rocket className="size-4" />
                      Latih & Simpan ke Ollama
                    </>
                  )}
                </Button>
              </div>

              {/* Status info callout */}
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                <Info className="size-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Setelah mengklik <strong>Latih & Simpan ke Ollama</strong>, model baru akan langsung aktif di Ollama lokal Anda. Anda dapat langsung memilih model tersebut di menu dropdown Zed untuk mulai koding dengan pengetahuan proyek ini!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: TrainerPage,
});
