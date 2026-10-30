import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FolderOpen,
  FolderPlus,
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Save,
  Rocket,
  Code2,
  Bug,
  Database,
  BrainCircuit,
  Loader2,
  Clock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Zap,
  Gauge,
  CheckCheck,
  SlidersHorizontal,
  PenTool,
  EyeOff,
  Eye,
  Trash2,
  Play,
  FileText,
  ListOrdered,
} from "lucide-react";
import {
  addProjectsToQueue,
  deleteProjectFromQueue,
  getModelInfo,
  getOllamaModels,
  getProjectQueue,
  processSingleProjectTraining,
  saveProjectRules,
  scanProject,
  selectFolder,
  selectMultipleFolders,
  testModel,
  toggleIgnoreProject,
  trainModel,
} from "@/actions/trainer";
import type { ProjectAnalysis } from "@/ipc/trainer/handlers";
import type { ProjectRecord } from "@/ipc/db/database";
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
    progressPercent: 40,
  },
  {
    id: 3,
    title: "Penyusunan Modelfile & Konfigurasi VRAM",
    description: "Mengatur context 32K (num_ctx 32768) dan parameter inference.",
    progressPercent: 60,
  },
  {
    id: 4,
    title: "Membangun & Menginjeksi Model ke Ollama",
    description: "Mengirim instruksi via POST /api/create ke runtime Ollama lokal.",
    progressPercent: 80,
  },
  {
    id: 5,
    title: "Analisis Arsitektur AI & Rencana Pengujian",
    description: "AI menganalisis proyek secara mendalam dan menguji inferensi live.",
    progressPercent: 100,
  },
];

interface TestPlanResult {
  success: boolean;
  modelName: string;
  prompt: string;
  response: string;
  durationMs: number;
  tokensPerSec: number;
  evalCount: number;
  checks: {
    modelLoaded: boolean;
    answeredPersona: boolean;
    hasResponse: boolean;
  };
  error?: string;
}

function TrainerPage() {
  const [ollamaStatus, setOllamaStatus] = useState<{
    online: boolean;
    models: Array<{ name: string; size: number }>;
  }>({ online: false, models: [] });

  // SQLite Batch Queue State
  const [projectQueue, setProjectQueue] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);

  const [projectPath, setProjectPath] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<ProjectAnalysis | null>(null);

  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("er-ai:latest");
  const [targetModelName, setTargetModelName] = useState<string>("er-ai");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("fullstack");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.3);
  const [contextLength, setContextLength] = useState<number>(32768);

  // Responsive mobile/tablet view switcher ("queue" | "editor")
  const [activeMobileView, setActiveMobileView] = useState<"queue" | "editor">("queue");

  // Existing habits / knowledge state
  const [existingHabits, setExistingHabits] = useState<string>("");
  const [hasExistingHabits, setHasExistingHabits] = useState<boolean>(false);
  const [showHabitDetail, setShowHabitDetail] = useState<boolean>(false);
  const [autoIncludeHabits, setAutoIncludeHabits] = useState<boolean>(true);

  // Batch Training Queue Execution State
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState<number>(0);
  const [batchTotalCount, setBatchTotalCount] = useState<number>(0);
  const [skipAlreadyTrained, setSkipAlreadyTrained] = useState<boolean>(true);

  // Single/Modal Training Progress state
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState<boolean>(false);
  const [currentStageId, setCurrentStageId] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [trainingStatus, setTrainingStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);

  // Verification & Test Plan state
  const [testPlanResult, setTestPlanResult] = useState<TestPlanResult | null>(null);
  const [interactivePrompt, setInteractivePrompt] = useState<string>("");
  const [isInteractiveTesting, setIsInteractiveTesting] = useState<boolean>(false);

  // AI Analysis View Modal State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [selectedAnalysisProject, setSelectedAnalysisProject] = useState<ProjectRecord | null>(null);

  // Fetch Ollama models & SQLite queue on mount
  useEffect(() => {
    refreshOllama();
    refreshQueue();
  }, []);

  const refreshQueue = async () => {
    try {
      const list = await getProjectQueue();
      setProjectQueue(list);
    } catch {
      // ignore
    }
  };

  // Fetch existing knowledge / habits whenever base model changes
  useEffect(() => {
    if (selectedBaseModel) {
      loadModelHabits(selectedBaseModel);
    }
  }, [selectedBaseModel]);

  const loadModelHabits = async (modelName: string) => {
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

  // Single folder picker
  const handlePickFolder = async () => {
    const res = await selectFolder();
    if (!res.canceled && res.path) {
      const updated = await addProjectsToQueue([res.path]);
      setProjectQueue(updated);
      setProjectPath(res.path);
      performScan(res.path);
    }
  };

  // Multiple folder picker (batch)
  const handlePickMultipleFolders = async () => {
    const res = await selectMultipleFolders();
    if (!res.canceled && res.paths && res.paths.length > 0) {
      toast.info(`Menambahkan ${res.paths.length} proyek ke antrean...`);
      const updated = await addProjectsToQueue(res.paths);
      setProjectQueue(updated);
      toast.success(`${res.paths.length} folder proyek berhasil ditambahkan ke database!`);

      // If no active project, pick the first added
      if (!projectPath && res.paths[0]) {
        setProjectPath(res.paths[0]);
        performScan(res.paths[0]);
      }
    }
  };

  // Select project from queue into editor
  const handleSelectFromQueue = (project: ProjectRecord) => {
    setActiveProject(project);
    setProjectPath(project.project_path);
    performScan(project.project_path);
  };

  // Toggle ignore project
  const handleToggleIgnore = async (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const newIgnored = project.is_ignored === 1 ? false : true;
    const updated = await toggleIgnoreProject(project.project_path, newIgnored);
    setProjectQueue(updated);
    toast.info(
      newIgnored
        ? `Proyek "${project.project_name}" di-ignore (akan dilewati antrean)`
        : `Proyek "${project.project_name}" diaktifkan kembali`
    );
  };

  // Delete project from SQLite queue
  const handleDeleteFromQueue = async (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await deleteProjectFromQueue(project.project_path);
    setProjectQueue(updated);
    if (projectPath === project.project_path) {
      setProjectPath("");
      setProjectData(null);
      setSystemPrompt("");
    }
    toast.success(`Proyek "${project.project_name}" dihapus dari database.`);
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
      toast.success(`Berhasil menganalisis "${data.name}"!`);
      setActiveMobileView("editor");
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

  // Helper delay
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Sequential Batch Training Execution
  const handleStartBatchProcessing = async () => {
    const targetQueue = projectQueue.filter((p) => {
      if (p.is_ignored === 1) return false;
      if (skipAlreadyTrained && p.status === "completed") return false;
      return true;
    });

    if (targetQueue.length === 0) {
      toast.info("Tidak ada proyek yang perlu diproses dalam antrean.");
      return;
    }

    setIsBatchProcessing(true);
    setBatchTotalCount(targetQueue.length);
    setIsTrainingModalOpen(true);
    setTrainingStatus("running");
    setTrainingError(null);
    setTrainingLogs([
      `[${new Date().toLocaleTimeString()}] Memulai pemrosesan bertahap ${targetQueue.length} proyek...`,
    ]);

    for (let i = 0; i < targetQueue.length; i++) {
      const item = targetQueue[i];
      setBatchCurrentIndex(i + 1);
      setCurrentStageId(1);
      setProgressPercent(Math.round(((i) / targetQueue.length) * 100));

      setTrainingLogs((prev) => [
        ...prev,
        `\n------------------------------------------------------------`,
        `[${new Date().toLocaleTimeString()}] [Proyek ${i + 1}/${targetQueue.length}] Memproses "${item.project_name}"...`,
        `[${new Date().toLocaleTimeString()}] Lokasi: ${item.project_path}`,
      ]);

      try {
        setCurrentStageId(2);
        setTrainingLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Mensintesis pengetahuan dan konfigurasi model...`,
        ]);
        await wait(300);

        setCurrentStageId(4);
        setTrainingLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Melatih & menginjeksi ke Ollama runtime...`,
        ]);

        const result = await processSingleProjectTraining({
          projectPath: item.project_path,
          baseModel: selectedBaseModel,
          templateId: selectedTemplate,
          temperature,
          contextLength,
        });

        if (result.success) {
          setCurrentStageId(5);
          setTrainingLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] [SUKSES] Model "${result.project?.target_model_name}" selesai dilatih (${result.tokensPerSec} tok/s)!`,
            `[${new Date().toLocaleTimeString()}] [AI ANALISIS SELESAI] Analisa arsitektur disimpan ke database SQLite.`,
          ]);

          // Update active test result preview
          if (result.aiAnalysis) {
            setTestPlanResult({
              success: true,
              modelName: result.project?.target_model_name || "",
              prompt: "Analisa Arsitektur Otomatis",
              response: result.aiAnalysis,
              durationMs: result.durationMs,
              tokensPerSec: result.tokensPerSec,
              evalCount: 0,
              checks: { modelLoaded: true, answeredPersona: true, hasResponse: true },
            });
          }
        } else {
          setTrainingLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] [GAGAL] ${result.message}`,
          ]);
        }
      } catch (err: any) {
        setTrainingLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ERROR] ${err.message}`,
        ]);
      }

      await refreshQueue();
      await wait(500);
    }

    setProgressPercent(100);
    setTrainingStatus("success");
    setIsBatchProcessing(false);
    refreshOllama();
    toast.success(`Pemrosesan ${targetQueue.length} proyek selesai!`);
  };

  // Interactive Live Prompt Testing
  const handleRunInteractiveTest = async () => {
    if (!interactivePrompt.trim()) return;
    setIsInteractiveTesting(true);
    setTrainingLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [CUSTOM TEST] Menguji: "${interactivePrompt}"...`,
    ]);
    try {
      const res = await testModel(targetModelName, interactivePrompt);
      if (res.success) {
        setTestPlanResult(res);
        setTrainingLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [HASIL UJI] ${res.tokensPerSec} tok/s, ${res.durationMs}ms`,
        ]);
        toast.success(`Uji coba sukses! Kecepatan: ${res.tokensPerSec} tok/s`);
      } else {
        toast.error(res.error || "Gagal menguji model");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInteractiveTesting(false);
    }
  };

  // Open AI Analysis Modal for a project
  const handleOpenAiAnalysis = (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAnalysisProject(project);
    setIsAnalysisModalOpen(true);
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

  // Queue Statistics
  const totalCount = projectQueue.length;
  const completedCount = projectQueue.filter((p) => p.status === "completed").length;
  const ignoredCount = projectQueue.filter((p) => p.is_ignored === 1).length;
  const pendingCount = projectQueue.filter(
    (p) => p.is_ignored === 0 && p.status !== "completed"
  ).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background text-foreground">
      {/* Top Application Header */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-border/70 bg-card/60 backdrop-blur px-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-sm">
            <BrainCircuit className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xs sm:text-sm tracking-tight text-foreground">
                ER-AI Trainer Studio
              </h1>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0 font-mono border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5"
              >
                SQLite Ingestion Hub
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Multi-Project Sequential Training & Architectural Insights
            </p>
          </div>
        </div>

        {/* Responsive Navigation Toggle for screens < lg */}
        <div className="flex lg:hidden items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveMobileView("queue")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium text-[11px] ${
              activeMobileView === "queue"
                ? "bg-card text-teal-600 dark:text-teal-400 shadow-sm border border-teal-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListOrdered className="size-3" />
            <span>Antrean ({totalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileView("editor")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium text-[11px] ${
              activeMobileView === "editor"
                ? "bg-card text-teal-600 dark:text-teal-400 shadow-sm border border-teal-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="size-3" />
            <span>Editor & Latih</span>
          </button>
        </div>

        {/* Ollama Status Indicator & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium border ${
              ollamaStatus.online
                ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                ollamaStatus.online ? "bg-teal-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="hidden sm:inline">
              {ollamaStatus.online
                ? `Ollama Aktif (${ollamaStatus.models.length} model)`
                : "Ollama Offline"}
            </span>
            <span className="inline sm:hidden">
              {ollamaStatus.online ? "Aktif" : "Offline"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={refreshOllama}
            className="size-7 sm:size-8 text-muted-foreground hover:text-teal-500"
            title="Refresh Ollama Models"
          >
            <RefreshCw className="size-3.5 sm:size-4" />
          </Button>

          <ToggleTheme />
        </div>
      </header>

      {/* Main Responsive Grid Body */}
      <div className="flex flex-1 overflow-hidden p-2.5 sm:p-4 gap-3 lg:gap-4 flex-col lg:flex-row">
        {/* Left Column: SQLite Multi-Project Queue & Config */}
        <div
          className={`w-full lg:w-[380px] xl:w-[420px] shrink-0 flex-col gap-3 overflow-y-auto pr-0 lg:pr-1 ${
            activeMobileView === "queue" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Card: Project Queue & Folder Adder */}
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm transition-all hover:border-teal-500/30">
            <CardHeader className="pb-2.5 pt-3.5 px-3.5 sm:px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3.5 text-teal-500" />
                  Antrean Proyek (SQLite)
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-teal-500/30 text-teal-600 dark:text-teal-400 px-1.5 py-0"
                >
                  {completedCount}/{totalCount} Terlatih
                </Badge>
              </div>

              {/* Action buttons to add folder(s) */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handlePickMultipleFolders}
                  size="sm"
                  className="flex-1 gap-1.5 h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-sm"
                >
                  <FolderPlus className="size-3.5" />
                  + Tambah Banyak Proyek
                </Button>
                <Button
                  onClick={handlePickFolder}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 text-xs border-border/80 hover:border-teal-500/40"
                  title="Pilih satu folder"
                >
                  <FolderOpen className="size-3.5" />
                  Tunggal
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-2.5 px-3.5 sm:px-4 pb-3.5">
              {/* Batch Queue Processing Trigger */}
              {projectQueue.length > 0 && (
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                      <Rocket className="size-3.5 text-teal-500" />
                      Proses Batch Bertahap
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {pendingCount} menunggu
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      id="skipTrained"
                      checked={skipAlreadyTrained}
                      onChange={(e) => setSkipAlreadyTrained(e.target.checked)}
                      className="rounded border-border accent-teal-600"
                    />
                    <label htmlFor="skipTrained" className="cursor-pointer">
                      Lewati yang sudah dilatihkan
                    </label>
                  </div>

                  <Button
                    onClick={handleStartBatchProcessing}
                    disabled={isBatchProcessing || pendingCount === 0}
                    className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white font-semibold gap-1.5"
                  >
                    {isBatchProcessing ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Sedang Memproses ({batchCurrentIndex}/{batchTotalCount})...
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 fill-current" />
                        Latih Semua Proyek Satu per Satu
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Project Queue List (Scrollable) */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
                {projectQueue.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Belum ada proyek dalam antrean</p>
                    <p className="text-[11px]">
                      Klik tombol di atas untuk memilih satu atau banyak folder proyek sekaligus.
                    </p>
                  </div>
                ) : (
                  projectQueue.map((item) => {
                    const isSelected = projectPath === item.project_path;
                    const isIgnored = item.is_ignored === 1;
                    const isCompleted = item.status === "completed";
                    const isTraining = item.status === "training";

                    return (
                      <div
                        key={item.project_path}
                        onClick={() => handleSelectFromQueue(item)}
                        className={`group relative rounded-lg border p-2.5 text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "border-teal-500 bg-teal-500/10 shadow-sm"
                            : isIgnored
                            ? "border-border/40 bg-muted/20 opacity-60"
                            : "border-border/70 bg-card hover:border-teal-500/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-semibold truncate ${
                                  isIgnored ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {item.project_name}
                              </span>

                              {/* Status Badges */}
                              {isCompleted && (
                                <Badge className="h-4 px-1 text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  ✓ Terlatih
                                </Badge>
                              )}
                              {isTraining && (
                                <Badge className="h-4 px-1 text-[9px] bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 animate-pulse">
                                  Melatih...
                                </Badge>
                              )}
                              {isIgnored && (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1 text-[9px] text-muted-foreground border-border"
                                >
                                  Di-Ignore
                                </Badge>
                              )}
                            </div>

                            <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                              {item.project_path}
                            </p>
                          </div>

                          {/* Action Buttons for this item */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* AI Analysis View button (if analyzed) */}
                            {item.ai_analysis && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => handleOpenAiAnalysis(item, e)}
                                className="size-6 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                                title="Lihat Laporan Analisa AI"
                              >
                                <Sparkles className="size-3" />
                              </Button>
                            )}

                            {/* Ignore toggle button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleToggleIgnore(item, e)}
                              className={`size-6 ${
                                isIgnored
                                  ? "text-muted-foreground hover:text-teal-500"
                                  : "text-muted-foreground hover:text-amber-500"
                              }`}
                              title={isIgnored ? "Aktifkan kembali" : "Abaikan / Ignore proyek ini"}
                            >
                              {isIgnored ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                            </Button>

                            {/* Delete button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleDeleteFromQueue(item, e)}
                              className="size-6 text-muted-foreground hover:text-rose-500"
                              title="Hapus dari database"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Speed & Date Meta */}
                        {isCompleted && item.trained_at && (
                          <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                            <span>
                              {new Date(item.trained_at).toLocaleDateString()} {new Date(item.trained_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {item.tokens_per_sec > 0 && (
                              <span className="font-mono text-teal-600 dark:text-teal-400">
                                • {Math.round(item.tokens_per_sec)} tok/s
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: Model Target & Parameters */}
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm transition-all hover:border-teal-500/30">
            <CardHeader className="pb-2.5 pt-3.5 px-3.5 sm:px-4">
              <CardTitle className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-muted-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-teal-500" />
                Target Model Ollama
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-3.5 sm:px-4 pb-3.5">
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
                  className="h-8 text-xs font-mono font-medium focus-visible:ring-teal-500/40"
                />
              </div>

              {/* Context Length & Temperature */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-mono">
                    Context Window:
                  </label>
                  <Input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(Number(e.target.value))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-mono">
                    Temperature:
                  </label>
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
        </div>

        {/* Right Column: Templates, Prompt Editor & Action Bar */}
        <div
          className={`flex flex-1 flex-col gap-3 overflow-hidden min-w-0 ${
            activeMobileView === "editor" ? "flex" : "hidden lg:flex"
          }`}
        >
          <Card className="flex flex-1 flex-col overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur-sm transition-all">
            <CardHeader className="pb-2.5 pt-3.5 px-3.5 sm:px-4 shrink-0 border-b border-border/60 bg-muted/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <FileCode className="size-4 text-teal-500" />
                      Editor Instruksi & Pengetahuan
                    </CardTitle>
                    {projectData && (
                      <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600">
                        {projectData.name}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-[11px] sm:text-xs">
                    Pilih template koding atau sesuaikan prompt sebelum model dilatihkan ke Ollama.
                  </CardDescription>
                </div>

                {hasExistingHabits && (
                  <label className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoIncludeHabits}
                      onChange={(e) => {
                        setAutoIncludeHabits(e.target.checked);
                        if (projectData) {
                          applyTemplateWithHabits(selectedTemplate, projectData, e.target.checked);
                        }
                      }}
                      className="rounded border-border accent-teal-600"
                    />
                    <span>Sertakan kebiasaan koding lama</span>
                  </label>
                )}
              </div>

              {/* Template Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6 gap-2 pt-2">
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
                          ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "bg-muted/30 hover:bg-muted/70 border-border/70 hover:border-teal-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-medium text-xs">
                        <Icon
                          className={`size-3.5 ${
                            isSelected ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                          }`}
                        />
                        <span className={`truncate ${isSelected ? "font-semibold" : ""}`}>
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

            <CardContent className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4 space-y-3">
              {/* Textarea Editor */}
              <div className="flex flex-1 flex-col space-y-1 overflow-hidden min-h-[180px]">
                <div className="flex items-center justify-between shrink-0">
                  <label className="text-xs font-medium text-muted-foreground">
                    Instruksi Sistem (System Prompt):
                  </label>
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
                      : "Pilih folder project dari antrean di sebelah kiri untuk menghasilkan instruksi otomatis..."
                  }
                  className="flex-1 font-mono text-xs leading-relaxed bg-background/90 resize-none min-h-[160px] border-border/80 focus-visible:ring-teal-500/40"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:items-center sm:justify-between border-t border-border/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyModelfile}
                    className="text-xs gap-1.5 h-8 hover:border-teal-500/40 hover:text-teal-500 transition-colors"
                    title="Salin format Modelfile lengkap"
                  >
                    <Copy className="size-3.5" />
                    Salin Modelfile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAgentsRules}
                    disabled={isSavingRules || !projectPath}
                    className="text-xs gap-1.5 h-8 hover:border-teal-500/40 hover:text-teal-500 transition-colors"
                    title="Simpan AGENTS.md langsung ke folder proyek Anda"
                  >
                    <Save className="size-3.5" />
                    Simpan AGENTS.md
                  </Button>
                </div>

                <Button
                  onClick={async () => {
                    if (!projectPath) {
                      toast.error("Pilih folder proyek terlebih dahulu!");
                      return;
                    }
                    setIsTrainingModalOpen(true);
                    setTrainingStatus("running");
                    setTrainingError(null);
                    setCurrentStageId(1);
                    setProgressPercent(20);
                    setTrainingLogs([
                      `[${new Date().toLocaleTimeString()}] Memulai pelatihan model untuk "${targetModelName}"...`,
                    ]);

                    try {
                      setCurrentStageId(3);
                      setProgressPercent(60);
                      await wait(400);

                      setCurrentStageId(4);
                      setProgressPercent(80);
                      const res = await processSingleProjectTraining({
                        projectPath,
                        baseModel: selectedBaseModel,
                        templateId: selectedTemplate,
                        temperature,
                        contextLength,
                        customSystemPrompt: systemPrompt,
                      });

                      if (res.success) {
                        setCurrentStageId(5);
                        setProgressPercent(100);
                        setTrainingStatus("success");
                        setTrainingLogs((prev) => [
                          ...prev,
                          `[${new Date().toLocaleTimeString()}] [SUKSES] Model "${res.project?.target_model_name}" selesai dilatih (${res.tokensPerSec} tok/s)!`,
                          `[${new Date().toLocaleTimeString()}] [AI ANALISIS] Laporan arsitektur proyek berhasil dibuat.`,
                        ]);
                        if (res.aiAnalysis) {
                          setTestPlanResult({
                            success: true,
                            modelName: res.project?.target_model_name || "",
                            prompt: "Analisa Arsitektur Proyek",
                            response: res.aiAnalysis,
                            durationMs: res.durationMs,
                            tokensPerSec: res.tokensPerSec,
                            evalCount: 0,
                            checks: { modelLoaded: true, answeredPersona: true, hasResponse: true },
                          });
                        }
                        refreshQueue();
                        refreshOllama();
                        toast.success(`Model "${targetModelName}" berhasil dilatih & dianalisis!`);
                      } else {
                        setTrainingStatus("error");
                        setTrainingError(res.message);
                      }
                    } catch (err: any) {
                      setTrainingStatus("error");
                      setTrainingError(err.message);
                    }
                  }}
                  disabled={!systemPrompt.trim() || !projectPath}
                  className="gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm hover:shadow-teal-500/20 h-9 px-4 transition-all"
                >
                  <Rocket className="size-4" />
                  Latih Proyek Ini Saja
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Multi-Stage Animated Progress & Verification Plan Modal */}
      <Dialog
        open={isTrainingModalOpen}
        onOpenChange={(open) => {
          if (trainingStatus === "running") return;
          setIsTrainingModalOpen(open);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[680px] max-h-[88vh] overflow-y-auto border-border/80 bg-card/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
              {trainingStatus === "running" && (
                <Loader2 className="size-5 animate-spin text-teal-500" />
              )}
              {trainingStatus === "success" && (
                <CheckCircle2 className="size-5 text-teal-500" />
              )}
              {trainingStatus === "error" && (
                <AlertCircle className="size-5 text-rose-500" />
              )}
              <span>
                {trainingStatus === "running" && (
                  isBatchProcessing
                    ? `Memproses Antrean (${batchCurrentIndex}/${batchTotalCount})...`
                    : "Proses Pelatihan & Injeksi Model..."
                )}
                {trainingStatus === "success" && "Pelatihan & Analisa AI Berhasil!"}
                {trainingStatus === "error" && "Gagal Melatih Model"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Membangun model ER-AI, menganalisis struktur arsitektur proyek, dan mencatat status ke SQLite.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar & Percentage */}
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                {isBatchProcessing
                  ? `Kemajuan Antrean (${batchCurrentIndex}/${batchTotalCount}):`
                  : "Status Kemajuan:"}
              </span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Step-by-Step Stage List */}
          <div className="space-y-1.5 rounded-lg border border-border/80 bg-muted/20 p-2.5">
            {TRAINING_STAGES.map((stage) => {
              const isPast = currentStageId > stage.id || trainingStatus === "success";
              const isCurrent = currentStageId === stage.id && trainingStatus === "running";
              const isFailed = currentStageId === stage.id && trainingStatus === "error";

              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-2.5 rounded-md p-1.5 text-xs transition-colors ${
                    isCurrent
                      ? "bg-teal-500/10 border border-teal-500/30"
                      : isPast
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {isPast && <CheckCircle2 className="size-4 text-teal-500" />}
                    {isCurrent && <Loader2 className="size-4 animate-spin text-teal-500" />}
                    {isFailed && <AlertCircle className="size-4 text-rose-500" />}
                    {!isPast && !isCurrent && !isFailed && (
                      <Clock className="size-4 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isCurrent ? "text-teal-600 dark:text-teal-400" : ""}`}>
                        {stage.title}
                      </span>
                      {isPast && (
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Selesai</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 animate-pulse font-medium">
                          Sedang Berjalan...
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification & AI Analysis Report */}
          {testPlanResult && testPlanResult.response && (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-teal-700 dark:text-teal-300">
                  <Sparkles className="size-4 text-teal-500" />
                  Laporan Hasil Analisa Arsitektur AI
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-teal-500/40 text-teal-600 dark:text-teal-300"
                >
                  Tersimpan di SQLite
                </Badge>
              </div>

              {/* Performance Metrics */}
              {testPlanResult.tokensPerSec > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-border/80 bg-background/80 p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <Zap className="size-3 text-amber-500" />
                      Kecepatan AI
                    </div>
                    <div className="text-xs font-mono font-bold text-foreground">
                      {testPlanResult.tokensPerSec}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">tok/s</span>
                    </div>
                  </div>

                  <div className="rounded border border-border/80 bg-background/80 p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <Gauge className="size-3 text-teal-500" />
                      Durasi Eksekusi
                    </div>
                    <div className="text-xs font-mono font-bold text-foreground">
                      {testPlanResult.durationMs}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">ms</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Output Response Sample */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-foreground">
                  Catatan & Evaluasi AI Terhadap Proyek:
                </span>
                <div className="rounded border border-teal-500/20 bg-background/90 p-2.5 font-mono text-[11px] leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap">
                  {testPlanResult.response}
                </div>
              </div>
            </div>
          )}

          {/* Live Log Console */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
              Log Terminal & Pemrosesan:
            </span>
            <div className="rounded-lg bg-black/90 dark:bg-black/95 p-2.5 font-mono text-[11px] text-teal-400 max-h-24 overflow-y-auto border border-border/40 space-y-0.5">
              {trainingLogs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes("[ERROR]") || log.includes("[FATAL]") || log.includes("[GAGAL]")
                      ? "text-rose-400"
                      : log.includes("[SUKSES]")
                      ? "text-emerald-400"
                      : log.includes("[TEST PLAN]") || log.includes("[Proyek")
                      ? "text-amber-300"
                      : ""
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            {trainingStatus === "running" ? (
              <span className="text-xs text-muted-foreground animate-pulse font-mono">
                Sedang memproses bertahap...
              </span>
            ) : (
              <Button
                onClick={() => setIsTrainingModalOpen(false)}
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs h-8 shadow-sm"
              >
                Selesai & Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Inspection Modal */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
              <Sparkles className="size-4 text-teal-500" />
              Laporan Analisa Arsitektur AI — {selectedAnalysisProject?.project_name}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono truncate">
              {selectedAnalysisProject?.project_path}
            </DialogDescription>
          </DialogHeader>

          {selectedAnalysisProject && (
            <div className="space-y-3 py-1">
              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="font-mono text-[10px]">
                  Model: {selectedAnalysisProject.target_model_name}
                </Badge>
                {selectedAnalysisProject.trained_at && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Dilatih: {new Date(selectedAnalysisProject.trained_at).toLocaleString()}
                  </Badge>
                )}
                {selectedAnalysisProject.tokens_per_sec > 0 && (
                  <Badge className="bg-teal-500/10 text-teal-600 font-mono text-[10px]">
                    {Math.round(selectedAnalysisProject.tokens_per_sec)} tok/s
                  </Badge>
                )}
              </div>

              {/* Analysis Text Body */}
              <div className="rounded-lg border border-teal-500/20 bg-muted/20 p-3 font-mono text-xs leading-relaxed max-h-[360px] overflow-y-auto whitespace-pre-wrap">
                {selectedAnalysisProject.ai_analysis || "Belum ada analisa untuk proyek ini."}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedAnalysisProject?.ai_analysis) {
                  navigator.clipboard.writeText(selectedAnalysisProject.ai_analysis);
                  toast.success("Laporan analisa berhasil disalin ke clipboard!");
                }
              }}
              className="text-xs gap-1.5"
            >
              <Copy className="size-3.5" />
              Salin Laporan
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAnalysisModalOpen(false)}
              className="text-xs bg-teal-600 hover:bg-teal-500 text-white"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: TrainerPage,
});
