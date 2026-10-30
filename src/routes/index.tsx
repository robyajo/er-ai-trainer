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
  Database,
  Info,
  BrainCircuit,
  Loader2,
  Clock,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getModelInfo,
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
1. Format API: Gunakan format JSON standar dan status HTTP yang semantik (200, 201, 400, 404, 500).
2. Validasi Input: Selalu validasi payload request (menggunakan Zod / FormRequest / DTO) sebelum dieksekusi.
3. Query Database: Hindari masalah N+1 queries. Gunakan parameterized queries atau ORM resmi untuk mencegah SQL Injection.
4. Keamanan: Lindungi endpoint sensitif dengan autentikasi & middleware otorisasi yang ketat.
5. Format Response: Sediakan struktur response konsisten ({ success: boolean, data?: any, error?: string }).`,
  },
  {
    id: "frontend",
    name: "Frontend, UI/UX & Tailwind",
    icon: Code2,
    description: "Pedoman komponen UI, Tailwind CSS, accessibility, dan responsive layout.",
    generate: (p) => `Kamu adalah ER-AI (Frontend & UI/UX Specialist) untuk proyek "${p.name}".

PEDOMAN FRONTEND & STYLING:
1. Desain & Styling: Gunakan Tailwind CSS yang modern, utilitas utility-first, dan dukung Dark/Light mode.
2. Komponen: Gunakan pola komponen atomik yang modular, reusable, dan accessible (a11y).
3. State Management: Pisahkan UI state lokal dan server state (gunakan React Query / caching bila relevan).
4. Responsivitas: Pastikan tampilan rapi dan adaptif dari layar mobile hingga desktop.
5. Berikan cuplikan JSX/TSX yang bersih, rapi, dan mudah dibaca.`,
  },
  {
    id: "testing",
    name: "Testing & Bug Auditor",
    icon: Bug,
    description: "Mendeteksi edge-case, celah keamanan, dan membuat automated tests.",
    generate: (p) => `Kamu adalah ER-AI (Senior QA & Security Auditor) untuk proyek "${p.name}".

PEDOMAN AUDIT & PENGUJIAN:
1. Setiap kode yang dibuat harus disertai skenario uji batas (edge cases).
2. Tuliskan unit test menggunakan framework testing proyek (Vitest / Jest / PHPUnit).
3. Periksa potensi Race Condition, Unhandled Promise Rejections, dan XSS/CSRF vulnerabilities.
4. Berikan saran refaktorisasi bila kode yang diperiksa kurang optimal atau sulit dirawat.`,
  },
  {
    id: "manual",
    name: "Custom Manual",
    icon: FileCode,
    description: "Mulai dari template kosong dan tulis instruksi kustom sepenuhnya.",
    generate: (p) => `Kamu adalah ER-AI, asisten koding khusus proyek "${p.name}".

Konteks Proyek:
- Folder: ${p.path}
- Stack: ${p.techStack.join(", ")}

Tuliskan aturan koding khusus Anda di bawah ini:
`,
  },
];

interface TrainingStage {
  id: number;
  title: string;
  description: string;
  progressPercent: number;
}

const TRAINING_STAGES: TrainingStage[] = [
  {
    id: 1,
    title: "Verifikasi File & Struktur Proyek",
    description: "Membaca arsitektur proyek, file package, dan dependencies.",
    progressPercent: 20,
  },
  {
    id: 2,
    title: "Sintesis Kebiasaan & Pengetahuan Koding",
    description: "Mengintegrasikan aturan koding personal dan konteks proyek.",
    progressPercent: 45,
  },
  {
    id: 3,
    title: "Penyusunan Modelfile & Konfigurasi VRAM",
    description: "Mengatur context 32K (num_ctx 32768) dan parameter inference.",
    progressPercent: 70,
  },
  {
    id: 4,
    title: "Membangun & Menginjeksi Model ke Ollama",
    description: "Mengirim instruksi via POST /api/create ke server Ollama lokal.",
    progressPercent: 90,
  },
  {
    id: 5,
    title: "Finalisasi & Pendaftaran Model",
    description: "Model siap digunakan langsung di Zed Editor, Cursor, dan AI Tool.",
    progressPercent: 100,
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

  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("er-ai:latest");
  const [targetModelName, setTargetModelName] = useState<string>("er-ai");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("fullstack");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.3);
  const [contextLength, setContextLength] = useState<number>(32768);

  // Existing habits / knowledge state
  const [existingHabits, setExistingHabits] = useState<string>("");
  const [hasExistingHabits, setHasExistingHabits] = useState<boolean>(false);
  const [isLoadingHabits, setIsLoadingHabits] = useState<boolean>(false);
  const [showHabitDetail, setShowHabitDetail] = useState<boolean>(false);
  const [autoIncludeHabits, setAutoIncludeHabits] = useState<boolean>(true);

  // Animated Training Progress Modal state
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState<boolean>(false);
  const [currentStageId, setCurrentStageId] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [trainingStatus, setTrainingStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);

  // Fetch Ollama models on mount
  useEffect(() => {
    refreshOllama();
  }, []);

  // Fetch existing knowledge / habits whenever base model changes
  useEffect(() => {
    if (selectedBaseModel) {
      loadModelHabits(selectedBaseModel);
    }
  }, [selectedBaseModel]);

  const loadModelHabits = async (modelName: string) => {
    setIsLoadingHabits(true);
    try {
      const info = await getModelInfo(modelName);
      if (info.success && info.hasExistingKnowledge && info.system) {
        setExistingHabits(info.system);
        setHasExistingHabits(true);
      } else {
        setExistingHabits("");
        setHasExistingHabits(false);
      }
    } catch {
      setExistingHabits("");
      setHasExistingHabits(false);
    } finally {
      setIsLoadingHabits(false);
    }
  };

  const refreshOllama = async () => {
    const res = await getOllamaModels();
    setOllamaStatus({
      online: res.online,
      models: res.models || [],
    });
    if (res.models && res.models.length > 0) {
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

      // Generate prompt combining personal habits with template
      applyTemplateWithHabits(selectedTemplate, data, hasExistingHabits && autoIncludeHabits);
      toast.success(`Berhasil menganalisis proyek "${data.name}"!`);
    } catch (err: any) {
      toast.error(`Gagal menganalisis proyek: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const applyTemplateWithHabits = (
    templateId: string,
    data: ProjectAnalysis,
    includeHabits: boolean
  ) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    const projectContent = tpl.generate(data);

    if (includeHabits && existingHabits.trim()) {
      const combined = `// ============================================
// ATURAN & KEBIASAAN KODING PRIBADI ANDA:
// (Tercatat dari model: ${selectedBaseModel})
// ============================================
${existingHabits.trim()}

// ============================================
// PENGETAHUAN ARSITEKTUR PROYEK SPESIFIK:
// ============================================
${projectContent.trim()}`;
      setSystemPrompt(combined);
    } else {
      setSystemPrompt(projectContent);
    }
  };

  // Switch template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (projectData) {
      applyTemplateWithHabits(templateId, projectData, hasExistingHabits && autoIncludeHabits);
    }
  };

  // Manual button to merge existing habits into prompt
  const handleMergeHabits = () => {
    if (!existingHabits.trim()) {
      toast.error("Model ini belum memiliki catatan kebiasaan sebelumnya.");
      return;
    }
    if (systemPrompt.includes("ATURAN & KEBIASAAN KODING PRIBADI")) {
      toast.info("Kebiasaan koding sudah ada di dalam prompt!");
      return;
    }

    const merged = `// ============================================
// ATURAN & KEBIASAAN KODING PRIBADI ANDA:
// (Tercatat dari model: ${selectedBaseModel})
// ============================================
${existingHabits.trim()}

${systemPrompt.trim()}`;
    setSystemPrompt(merged);
    toast.success("Kebiasaan koding lama berhasil digabungkan dengan proyek ini!");
  };

  const handleUseExistingHabitOnly = () => {
    if (!existingHabits.trim()) return;
    setSystemPrompt(existingHabits);
    toast.success("Instruksi direset ke kebiasaan koding lama!");
  };

  // Helper delay
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Multi-stage animated training
  const handleTrainWithAnimation = async () => {
    if (!targetModelName.trim()) {
      toast.error("Nama model baru tidak boleh kosong!");
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error("Instruksi sistem tidak boleh kosong!");
      return;
    }

    setIsTrainingModalOpen(true);
    setTrainingStatus("running");
    setTrainingError(null);
    setCurrentStageId(1);
    setProgressPercent(10);
    setTrainingLogs([
      `[${new Date().toLocaleTimeString()}] Memulai sesi pelatihan untuk "${targetModelName}"...`,
    ]);

    // Stage 1: Verifikasi File
    await wait(400);
    setCurrentStageId(1);
    setProgressPercent(20);
    setTrainingLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Memeriksa struktur proyek dan file konfigurasi stack...`,
    ]);

    // Stage 2: Sintesis Kebiasaan & Aturan
    await wait(500);
    setCurrentStageId(2);
    setProgressPercent(45);
    setTrainingLogs((prev) => [
      ...prev,
      hasExistingHabits
        ? `[${new Date().toLocaleTimeString()}] Mengintegrasikan kebiasaan koding lama (${selectedBaseModel}) dengan aturan proyek...`
        : `[${new Date().toLocaleTimeString()}] Mensintesis prompt instruksi dan konvensi proyek...`,
    ]);

    // Stage 3: Modelfile & Parameter VRAM
    await wait(500);
    setCurrentStageId(3);
    setProgressPercent(70);
    setTrainingLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Mengonfigurasi parameter: context 32768, temperature ${temperature}, top_p 0.85...`,
    ]);

    // Stage 4: Kirim ke Ollama API
    await wait(400);
    setCurrentStageId(4);
    setProgressPercent(85);
    setTrainingLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Mengirim payload ke Ollama runtime (POST /api/create)...`,
    ]);

    try {
      const res = await trainModel({
        newModelName: targetModelName,
        baseModel: selectedBaseModel,
        systemPrompt: systemPrompt,
        temperature,
        contextLength,
        saveLocalModelfile: true,
        projectPath: projectPath || undefined,
      });

      if (!res.success) {
        setTrainingStatus("error");
        setTrainingError(res.message);
        setTrainingLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ERROR] ${res.message}`,
        ]);
        return;
      }

      // Stage 5: Finalisasi & Berhasil
      setCurrentStageId(5);
      setProgressPercent(100);
      setTrainingStatus("success");
      setTrainingLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SUCCESS] Model "${targetModelName}" berhasil dibuat dan siap diuji!`,
      ]);

      refreshOllama();
      toast.success(`Model "${targetModelName}" berhasil dilatih dan disimpan ke Ollama!`);
    } catch (err: any) {
      setTrainingStatus("error");
      setTrainingError(err.message || "Gagal menghubungi Ollama.");
      setTrainingLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [FATAL] ${err.message}`,
      ]);
    }
  };

  // Save AGENTS.md
  const handleSaveAgentsRules = async () => {
    if (!projectPath) {
      toast.error("Pilih folder proyek terlebih dahulu!");
      return;
    }
    setIsSavingRules(true);
    try {
      const res = await saveProjectRules(projectPath, systemPrompt);
      if (res.success) {
        toast.success(`File AGENTS.md berhasil disimpan di: ${res.path}`);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSavingRules(false);
    }
  };

  // Copy Modelfile
  const handleCopyModelfile = () => {
    const content = `FROM ${selectedBaseModel}

PARAMETER temperature ${temperature}
PARAMETER top_p 0.85
PARAMETER num_ctx ${contextLength}

SYSTEM """
${systemPrompt.trim()}
"""
`;
    navigator.clipboard.writeText(content);
    toast.success("Isi Modelfile berhasil disalin ke clipboard!");
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* App Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-card/60 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight">ER-AI Trainer Studio</h1>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                v1.0.0
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Knowledge Ingestion & Local Model Tuning Hub
            </p>
          </div>
        </div>

        {/* Ollama Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
              ollamaStatus.online
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                ollamaStatus.online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>
              {ollamaStatus.online
                ? `Ollama Aktif (${ollamaStatus.models.length} model)`
                : "Ollama Offline"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={refreshOllama}
            className="size-8"
            title="Refresh Ollama Models"
          >
            <RefreshCw className="size-4" />
          </Button>

          <ToggleTheme />
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left Column: Project Selector & Config */}
        <div className="flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          {/* Card 1: Folder Picker */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5 uppercase text-muted-foreground tracking-wider">
                <FolderOpen className="size-3.5 text-primary" />
                Folder Proyek
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  placeholder="Belum ada folder yang dipilih..."
                  value={projectPath}
                  className="text-xs font-mono bg-muted/40 h-8"
                />
                <Button
                  onClick={handlePickFolder}
                  size="sm"
                  className="gap-1.5 shrink-0 h-8 text-xs"
                >
                  <FolderOpen className="size-3.5" />
                  Pilih Folder
                </Button>
              </div>

              {/* Scanning status */}
              {isScanning && (
                <div className="flex items-center gap-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground animate-pulse">
                  <RefreshCw className="size-3.5 animate-spin text-primary" />
                  <span>Menganalisis file dan arsitektur proyek...</span>
                </div>
              )}

              {/* Project preview if scanned */}
              {projectData && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {projectData.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] py-0">
                      {projectData.folderTree.length} item
                    </Badge>
                  </div>

                  {projectData.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {projectData.techStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="text-[10px] bg-background/50 px-1.5 py-0"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {projectData.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Model Configuration */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5 uppercase text-muted-foreground tracking-wider">
                <Cpu className="size-3.5 text-primary" />
                Target Model Ollama
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {/* Base Model Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Pilih Model Dasar:
                </label>
                <Select
                  value={selectedBaseModel}
                  onValueChange={(val) => setSelectedBaseModel(val)}
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Pilih model dasar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ollamaStatus.models.length > 0 ? (
                      ollamaStatus.models.map((m) => (
                        <SelectItem key={m.name} value={m.name} className="text-xs font-mono">
                          {m.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="er-ai:latest" className="text-xs font-mono">
                        er-ai:latest (Default)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Model Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Nama Model Baru Hasil Latihan:
                </label>
                <Input
                  value={targetModelName}
                  onChange={(e) => setTargetModelName(e.target.value)}
                  placeholder="contoh: er-ai-myproject"
                  className="h-8 text-xs font-mono font-medium"
                />
              </div>

              {/* Context Length & Temperature */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Context Window:</label>
                  <Input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(Number(e.target.value))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Temperature:</label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Detected Personal Habits / Previous Knowledge */}
          {hasExistingHabits && (
            <Card className="border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-sm transition-all">
              <CardHeader className="py-2.5 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className="size-4 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Kebiasaan Koding Model Terdeteksi
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-500 px-1 py-0">
                    Tercatat
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground pt-0.5 leading-snug">
                  Model <strong>{selectedBaseModel}</strong> sudah menyimpan preferensi & aturan koding Anda sebelumnya.
                </p>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowHabitDetail(!showHabitDetail)}
                  className="flex items-center justify-between w-full text-[11px] text-indigo-500 hover:underline pt-1"
                >
                  <span>{showHabitDetail ? "Sembunyikan Catatan" : "Lihat Isi Kebiasaan Tersimpan"}</span>
                  {showHabitDetail ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>

                {showHabitDetail && (
                  <div className="rounded border bg-background/80 p-2 font-mono text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {existingHabits}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={handleMergeHabits}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    <Sparkles className="size-3 mr-1" />
                    Gabungkan ke Prompt Proyek Ini
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleUseExistingHabitOnly}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Pakai Kebiasaan Ini Saja
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Templates, Prompt Editor & Action Bar */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <Card className="flex flex-1 flex-col overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 shrink-0 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <FileCode className="size-4 text-primary" />
                    Instruksi Pengetahuan & Template Koding
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pilih template instruksi atau modifikasi teks di bawah untuk melatih model ER-AI.
                  </CardDescription>
                </div>

                {hasExistingHabits && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoIncludeHabits}
                      onChange={(e) => {
                        setAutoIncludeHabits(e.target.checked);
                        if (projectData) {
                          applyTemplateWithHabits(selectedTemplate, projectData, e.target.checked);
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span>Otomatis sertakan kebiasaan koding lama</span>
                  </label>
                )}
              </div>

              {/* Template Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2.5 sm:grid-cols-3 md:grid-cols-6">
                {TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`flex flex-col items-start gap-1 rounded-lg border p-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "bg-muted/30 hover:bg-muted/70 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-medium text-xs">
                        <Icon className={`size-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`truncate ${isSelected ? "text-primary font-semibold" : ""}`}>
                          {tpl.name}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[10px] text-muted-foreground leading-snug">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col overflow-hidden p-4 space-y-3">
              {/* Textarea Editor */}
              <div className="flex flex-1 flex-col space-y-1 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
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
                  className="flex-1 font-mono text-xs leading-relaxed bg-background/90 resize-none min-h-[220px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between border-t shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyModelfile}
                    className="text-xs gap-1.5 h-8"
                    title="Salin format Modelfile lengkap"
                  >
                    <Copy className="size-3.5" />
                    Salin Modelfile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAgentsRules}
                    disabled={isSavingRules || !projectData}
                    className="text-xs gap-1.5 h-8"
                    title="Simpan AGENTS.md langsung ke folder proyek Anda"
                  >
                    <Save className="size-3.5" />
                    Simpan AGENTS.md
                  </Button>
                </div>

                <Button
                  onClick={handleTrainWithAnimation}
                  disabled={!systemPrompt.trim()}
                  className="gap-2 bg-primary font-semibold shadow-md hover:bg-primary/90 h-9 px-4"
                >
                  <Rocket className="size-4" />
                  Mulai Latih & Simpan ke Ollama
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Multi-Stage Animated Progress Modal */}
      <Dialog
        open={isTrainingModalOpen}
        onOpenChange={(open) => {
          if (trainingStatus === "running") return; // Prevent closing while running
          setIsTrainingModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {trainingStatus === "running" && (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              {trainingStatus === "success" && (
                <CheckCircle2 className="size-5 text-emerald-500" />
              )}
              {trainingStatus === "error" && (
                <AlertCircle className="size-5 text-rose-500" />
              )}
              <span>
                {trainingStatus === "running" && "Proses Pelatihan & Injeksi Model..."}
                {trainingStatus === "success" && "Pelatihan Model Selesai!"}
                {trainingStatus === "error" && "Gagal Melatih Model"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Membangun model kustom <strong>"{targetModelName}"</strong> berdasarkan base model{" "}
              <strong>"{selectedBaseModel}"</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar & Percentage */}
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Status Kemajuan:</span>
              <span className="font-mono font-bold text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Step-by-Step Stage List */}
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            {TRAINING_STAGES.map((stage) => {
              const isPast = currentStageId > stage.id || trainingStatus === "success";
              const isCurrent = currentStageId === stage.id && trainingStatus === "running";
              const isFailed = currentStageId === stage.id && trainingStatus === "error";

              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-2.5 rounded-md p-1.5 text-xs transition-colors ${
                    isCurrent
                      ? "bg-primary/10 border border-primary/20"
                      : isPast
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {isPast && <CheckCircle2 className="size-4 text-emerald-500" />}
                    {isCurrent && <Loader2 className="size-4 animate-spin text-primary" />}
                    {isFailed && <AlertCircle className="size-4 text-rose-500" />}
                    {!isPast && !isCurrent && !isFailed && (
                      <Clock className="size-4 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isCurrent ? "text-primary" : ""}`}>
                        {stage.title}
                      </span>
                      {isPast && (
                        <span className="text-[10px] text-emerald-600 font-medium">Selesai</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] text-primary animate-pulse font-medium">
                          Sedang Berlangsung...
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Log Console */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
              Log Terminal:
            </span>
            <div className="rounded-lg bg-black/90 dark:bg-black/80 p-2.5 font-mono text-[11px] text-emerald-400 max-h-28 overflow-y-auto border border-border/40 space-y-0.5">
              {trainingLogs.map((log, index) => (
                <div
                  key={index}
                  className={log.includes("[ERROR]") || log.includes("[FATAL]") ? "text-rose-400" : ""}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Success Banner */}
          {trainingStatus === "success" && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs space-y-1 text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Check className="size-4 text-emerald-500" />
                Model Siap Digunakan!
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Model <strong>{targetModelName}</strong> telah terdaftar di Ollama lokal Anda dengan context window 32K. Buka <strong>Zed Editor</strong> atau IDE Anda untuk langsung menggunakannya.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {trainingStatus === "error" && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs space-y-1 text-rose-700 dark:text-rose-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <X className="size-4 text-rose-500" />
                Terjadi Kesalahan
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {trainingError || "Gagal membangun model di Ollama."}
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            {trainingStatus === "running" ? (
              <span className="text-xs text-muted-foreground animate-pulse">
                Mohon tunggu beberapa detik...
              </span>
            ) : trainingStatus === "success" ? (
              <Button
                onClick={() => setIsTrainingModalOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              >
                Selesai & Tutup
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTrainingModalOpen(false)}
                  className="text-xs h-8"
                >
                  Tutup
                </Button>
                <Button
                  size="sm"
                  onClick={handleTrainWithAnimation}
                  className="text-xs h-8"
                >
                  Coba Lagi
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: TrainerPage,
});
