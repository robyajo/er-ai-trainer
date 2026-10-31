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
  Rocket,
  Code2,
  Bug,
  Database,
  BrainCircuit,
  Loader2,
  Clock,
  EyeOff,
  Eye,
  Trash2,
  Play,
  Zap,
  Gauge,
  ListOrdered,
  PenTool,
  Bot,
  UploadCloud,
} from "lucide-react";
import {
  addProjectsToQueue,
  deleteProjectFromQueue,
  getModelInfo,
  getOllamaModels,
  getProjectQueue,
  processSingleProjectTraining,
  scanProject,
  selectFolder,
  selectMultipleFolders,
  testModel,
  toggleIgnoreProject,
} from "@/actions/trainer";
import type { ProjectAnalysis } from "@/ipc/trainer/handlers";
import type { ProjectRecord } from "@/ipc/db/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { TrainerChatTab } from "@/components/trainer-chat-tab";
import { OpenCodeModelsDialog } from "@/components/opencode-models-dialog";
import { PushModelDialog } from "@/components/push-model-dialog";
import DragWindowRegion from "@/components/drag-window-region";

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
  const [, setActiveProject] = useState<ProjectRecord | null>(null);

  const [projectPath, setProjectPath] = useState<string>("");
  const [, setIsScanning] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<ProjectAnalysis | null>(null);

  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("er-ai-code:v1.0");
  const [targetModelName, setTargetModelName] = useState<string>("er-ai-code:v1.0");
  const [analysisEngine, setAnalysisEngine] = useState<"ollama" | "opencode">("opencode");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("fullstack");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.3);
  const [contextLength, setContextLength] = useState<number>(32768);

  // Top-level Application Tab ("trainer" | "chat")
  const [activeMainTab, setActiveMainTab] = useState<"trainer" | "chat">("trainer");

  // Responsive mobile/tablet view switcher ("queue" | "editor")
  const [activeMobileView, setActiveMobileView] = useState<"queue" | "editor">("queue");

  // Existing habits / knowledge state
  const [existingHabits, setExistingHabits] = useState<string>("");
  const [hasExistingHabits, setHasExistingHabits] = useState<boolean>(false);
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
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);

  // Verification & Test Plan state
  const [testPlanResult, setTestPlanResult] = useState<TestPlanResult | null>(null);

  // AI Analysis View Modal State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [isOpenCodeModalOpen, setIsOpenCodeModalOpen] = useState<boolean>(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);
  const [pushTargetModel, setPushTargetModel] = useState<string>("");
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
    const models = res.models || [];
    setOllamaStatus({
      online: res.online,
      models,
    });
    if (models.length > 0) {
      // Find latest er-ai-code:v* (or fallback to legacy er-ai:v*)
      let highestMajor = -1;
      let highestMinor = -1;
      let latestErAiCode: string | null = null;
      for (const m of models) {
        const match = m.name.match(/^(?:er-ai-code|er-ai):v?(\d+)\.(\d+)$/i);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);
          if (major > highestMajor || (major === highestMajor && minor > highestMinor)) {
            highestMajor = major;
            highestMinor = minor;
            latestErAiCode = m.name;
          }
        }
      }
      if (!latestErAiCode) {
        if (models.some((m) => m.name === "er-ai-code:latest")) latestErAiCode = "er-ai-code:latest";
        else if (models.some((m) => m.name === "er-ai-code")) latestErAiCode = "er-ai-code";
        else if (models.some((m) => m.name === "er-ai:latest")) latestErAiCode = "er-ai:latest";
        else if (models.some((m) => m.name === "er-ai")) latestErAiCode = "er-ai";
      }

      const preferred =
        (latestErAiCode ? models.find((m) => m.name === latestErAiCode) : null) ||
        models.find(
          (m) =>
            m.name.includes("coder") ||
            m.name.includes("qwen") ||
            m.name.includes("llama") ||
            m.name.includes("deepseek") ||
            m.name.includes("mistral")
        ) ||
        models[0];

      if (preferred) {
        setSelectedBaseModel(preferred.name);
      }

      // Automatically calculate next targetModelName version based on existing models
      const allKnownNames = models.map((m) => m.name);
      try {
        const queue = await getProjectQueue();
        queue.forEach((p) => {
          if (p.target_model_name) allKnownNames.push(p.target_model_name);
        });
      } catch {}

      let nextMajor = 1;
      let nextMinor = -1;
      for (const name of allKnownNames) {
        const match = name.match(/^(?:er-ai-code|er-ai):v?(\d+)\.(\d+)$/i);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10);
          if (major > nextMajor || (major === nextMajor && minor > nextMinor)) {
            nextMajor = major;
            nextMinor = minor;
          }
        }
      }
      const nextVer = nextMinor === -1 ? "er-ai-code:v1.0" : `er-ai-code:v${nextMajor}.${nextMinor + 1}`;
      setTargetModelName((curr) => {
        if (
          !curr ||
          curr === "er-ai:latest" ||
          curr === "er-ai" ||
          curr === "er-ai-code:latest" ||
          curr === "er-ai-code" ||
          curr === "er-ai:v1.0" ||
          curr === "er-ai-code:v1.0"
        ) {
          return nextVer;
        }
        return curr;
      });
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
      toast.success(`${res.paths.length} folder proyek berhasil ditambahkan ke antrean!`);

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
        ? `Proyek "${project.project_name}" diabaikan (dilewati saat batch)`
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
    setTrainingLogs([
      `[${new Date().toLocaleTimeString()}] Memulai pemrosesan bertahap ${targetQueue.length} proyek...`,
    ]);

    for (let i = 0; i < targetQueue.length; i++) {
      const item = targetQueue[i];
      setBatchCurrentIndex(i + 1);
      setCurrentStageId(1);
      setProgressPercent(Math.round((i / targetQueue.length) * 100));

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
          targetModelName: targetModelName.trim() || undefined,
          analysisEngine,
          opencodeModel: "opencode/nemotron-3.5-lightning-free",
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

  // Open AI Analysis Modal for a project
  const handleOpenAiAnalysis = (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAnalysisProject(project);
    setIsAnalysisModalOpen(true);
  };

  // Copy Prompt
  const handleCopyPrompt = () => {
    if (!systemPrompt.trim()) return;
    navigator.clipboard.writeText(systemPrompt);
    toast.success("Instruksi prompt berhasil disalin ke clipboard!");
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
    toast.success("Isi Modelfile disalin ke clipboard!");
  };

  // Queue Statistics
  const totalCount = projectQueue.length;
  const completedCount = projectQueue.filter((p) => p.status === "completed").length;
  const pendingCount = projectQueue.filter(
    (p) => p.is_ignored === 0 && p.status !== "completed"
  ).length;

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* Sleek Unified Application Titlebar Header */}
      <DragWindowRegion
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400">
                <BrainCircuit className="size-4" />
              </div>
              <span className="font-semibold text-xs tracking-tight text-foreground hidden sm:inline">
                ER-AI Studio
              </span>
            </div>

            {/* Top-Level Main App Tabs: Tab 1 Trainer, Tab 2 Uji & Chat */}
            <div
              className="no-drag flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 pointer-events-auto"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => setActiveMainTab("trainer")}
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                className={`no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none ${
                  activeMainTab === "trainer"
                    ? "bg-background text-teal-600 dark:text-teal-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                <Sparkles className="size-3.5" />
                <span>Trainer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab("chat")}
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                className={`no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none ${
                  activeMainTab === "chat"
                    ? "bg-background text-teal-600 dark:text-teal-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                <Bot className="size-3.5" />
                <span>Uji & Chat AI</span>
                <span className="flex size-1.5 rounded-full bg-teal-400 animate-pulse ml-0.5" />
              </button>
            </div>
          </div>
        }
      >
        {/* Ollama Status Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 text-[11px] font-medium border shrink-0 ${
            ollamaStatus.online
              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              ollamaStatus.online ? "bg-teal-500 animate-pulse" : "bg-destructive"
            }`}
          />
          <span className="hidden md:inline">
            {ollamaStatus.online
              ? `Ollama Aktif (${ollamaStatus.models.length} model)`
              : "Ollama Offline"}
          </span>
          <span className="inline md:hidden">
            {ollamaStatus.online ? "Aktif" : "Offline"}
          </span>
        </div>

        {/* Refresh Ollama Models Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshOllama}
          className="size-7 text-muted-foreground hover:text-teal-500 shrink-0"
          title="Segarkan Model Ollama"
        >
          <RefreshCw className="size-3.5" />
        </Button>

        {/* Push Model ke Ollama Hub Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPushTargetModel(selectedBaseModel || targetModelName);
            setIsPushModalOpen(true);
          }}
          className="h-7 px-2 sm:px-2.5 text-xs text-teal-400 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15 gap-1.5 font-medium shrink-0"
          title="Push / Ekspor Model ke Device Lain"
        >
          <UploadCloud className="size-3.5" />
          <span className="hidden md:inline">Push ke Hub</span>
        </Button>

        {/* Dark/Light Theme Switcher */}
        <ToggleTheme />
      </DragWindowRegion>

      {/* Responsive Mobile Subheader: Antrean vs Editor Switcher (Visible on < lg when in Trainer tab) */}
      {activeMainTab === "trainer" && (
        <div className="flex lg:hidden items-center justify-between px-2.5 sm:px-3 py-1.5 border-b border-border bg-card/60 backdrop-blur-xs shrink-0">
          <Tabs
            value={activeMobileView}
            onValueChange={(val) => setActiveMobileView(val as "queue" | "editor")}
            className="w-full"
          >
            <TabsList className="h-8 p-0.5 bg-muted/60 w-full grid grid-cols-2">
              <TabsTrigger
                value="queue"
                className="text-xs px-2 py-1 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 font-medium"
              >
                <ListOrdered className="size-3.5" />
                <span>Antrean & Target ({totalCount})</span>
              </TabsTrigger>
              <TabsTrigger
                value="editor"
                className="text-xs px-2 py-1 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 font-medium"
              >
                <PenTool className="size-3.5" />
                <span>Editor & Latih</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Tab 1: Trainer Studio vs Tab 2: Uji & Chat AI */}
      {activeMainTab === "trainer" ? (
      <div className="flex flex-1 overflow-y-auto lg:overflow-hidden p-2.5 sm:p-3 lg:p-4 gap-2.5 sm:gap-3 lg:gap-4 flex-col lg:flex-row">
        {/* Left Column: SQLite Multi-Project Queue & Parameters */}
        <div
          className={`w-full lg:w-[360px] xl:w-[410px] shrink-0 flex flex-col gap-2.5 sm:gap-3 overflow-hidden ${
            activeMobileView === "queue" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Card: SQLite Multi-Project Queue */}
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="py-2.5 px-3 sm:px-3.5 border-b border-border bg-muted/10 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xs font-mono tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3.5 text-teal-500" />
                  <span>Antrean Proyek (SQLite)</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-teal-500/30 text-teal-600 dark:text-teal-400 px-1.5 py-0"
                >
                  {completedCount}/{totalCount} Terlatih
                </Badge>
              </div>

              {/* Action buttons to add folder(s) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1.5">
                <Button
                  onClick={handlePickMultipleFolders}
                  size="sm"
                  className="col-span-1 sm:col-span-2 gap-1.5 h-7.5 sm:h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-xs"
                >
                  <FolderPlus className="size-3.5" />
                  <span className="truncate">+ Tambah Banyak</span>
                </Button>
                <Button
                  onClick={handlePickFolder}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7.5 sm:h-8 text-xs hover:border-teal-500/40"
                  title="Pilih satu folder"
                >
                  <FolderOpen className="size-3.5" />
                  <span>Tunggal</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col overflow-hidden p-3 gap-2.5">
              {/* Batch Processing Execution Control */}
              {projectQueue.length > 0 && (
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 p-2.5 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                      <Rocket className="size-3.5 text-teal-500" />
                      Proses Batch Bertahap
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {pendingCount} menunggu
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="skipTrained"
                      size="sm"
                      checked={skipAlreadyTrained}
                      onCheckedChange={setSkipAlreadyTrained}
                    />
                    <Label
                      htmlFor="skipTrained"
                      className="text-xs text-muted-foreground font-normal cursor-pointer select-none"
                    >
                      Lewati yang sudah dilatihkan
                    </Label>
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

              {/* Scrollable Project List */}
              <ScrollArea className="flex-1 w-full rounded-md border border-border p-1">
                {projectQueue.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Belum ada proyek dalam antrean</p>
                    <p className="text-[11px]">
                      Klik tombol di atas untuk memilih satu atau banyak folder proyek sekaligus.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-0.5">
                    {projectQueue.map((item) => {
                      const isSelected = projectPath === item.project_path;
                      const isIgnored = item.is_ignored === 1;
                      const isCompleted = item.status === "completed";
                      const isTraining = item.status === "training";

                      return (
                        <div
                          key={item.project_path}
                          onClick={() => handleSelectFromQueue(item)}
                          className={`group rounded-lg border p-2.5 text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "border-teal-500 bg-teal-500/10 shadow-xs"
                              : isIgnored
                              ? "border-border/40 bg-muted/20 opacity-60"
                              : "border-border bg-card hover:border-teal-500/40 hover:bg-muted/40"
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

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
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

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => handleDeleteFromQueue(item, e)}
                                className="size-6 text-muted-foreground hover:text-destructive"
                                title="Hapus dari database"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>

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
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Card: Model Target & Hyperparameters */}
          <Card className="shrink-0 border-border bg-card shadow-2xs">
            <CardHeader className="py-2 px-3 sm:px-3.5 border-b border-border/60 bg-muted/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-teal-500" />
                <span>Target Model Ollama</span>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpenCodeModalOpen(true)}
                  className="h-6 px-1.5 text-[10px] font-mono text-teal-400 hover:text-teal-300 gap-1"
                  title="Katalog Model OpenCode Free"
                >
                  <Sparkles className="size-3" />
                  <span className="hidden sm:inline">Katalog</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPushTargetModel(selectedBaseModel || targetModelName);
                    setIsPushModalOpen(true);
                  }}
                  className="h-6 px-1.5 text-[10px] font-mono text-teal-400 hover:text-teal-300 gap-1"
                  title="Push model ke Ollama Hub"
                >
                  <UploadCloud className="size-3" />
                  <span>Push</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2.5 sm:p-3 space-y-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Pilih Model Dasar:
                </Label>
                <Select
                  value={selectedBaseModel}
                  onValueChange={(val) => setSelectedBaseModel(val)}
                >
                  <SelectTrigger className="h-7.5 sm:h-8 text-xs font-mono">
                    <SelectValue placeholder="Pilih model dasar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const codeModels = ollamaStatus.models.filter(
                        (m) => m.name.startsWith("er-ai-code") || m.name.startsWith("er-ai:") || m.name === "er-ai"
                      );
                      const assistantModels = ollamaStatus.models.filter(
                        (m) => m.name.startsWith("er-ai-assistant") || m.name.startsWith("er-ai-asistan")
                      );
                      const visionModels = ollamaStatus.models.filter(
                        (m) => m.name.startsWith("er-ai-vision") || m.name.includes("vision") || m.name.includes("omni")
                      );
                      const thinkModels = ollamaStatus.models.filter(
                        (m) =>
                          (m.name.includes("deepseek-r1") || m.name.includes("lfm3") || m.name.includes("think")) &&
                          !visionModels.includes(m)
                      );
                      const otherModels = ollamaStatus.models.filter(
                        (m) =>
                          !codeModels.includes(m) &&
                          !assistantModels.includes(m) &&
                          !visionModels.includes(m) &&
                          !thinkModels.includes(m)
                      );

                      return (
                        <>
                          {codeModels.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">
                                ★ Model Koding ER-AI (er-ai-code)
                              </div>
                              {codeModels.map((m) => (
                                <SelectItem
                                  key={m.name}
                                  value={m.name}
                                  className="text-xs font-mono text-teal-300 font-semibold"
                                >
                                  💻 {m.name} (Koding Aktif)
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {assistantModels.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider border-t border-border/40 mt-1">
                                ★ Model Asisten ER-AI (er-ai-assistant)
                              </div>
                              {assistantModels.map((m) => (
                                <SelectItem
                                  key={m.name}
                                  value={m.name}
                                  className="text-xs font-mono text-emerald-300 font-semibold"
                                >
                                  🤖 {m.name} (Asisten BI)
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {visionModels.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-mono text-pink-400 font-bold uppercase tracking-wider border-t border-border/40 mt-1">
                                ★ Model Vision & Multimodal
                              </div>
                              {visionModels.map((m) => (
                                <SelectItem
                                  key={m.name}
                                  value={m.name}
                                  className="text-xs font-mono text-pink-300 font-semibold"
                                >
                                  👁️ {m.name} (Vision & Audio)
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {thinkModels.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider border-t border-border/40 mt-1">
                                ★ Model Penalaran / Thinking
                              </div>
                              {thinkModels.map((m) => (
                                <SelectItem
                                  key={m.name}
                                  value={m.name}
                                  className="text-xs font-mono text-purple-300 font-semibold"
                                >
                                  🧠 {m.name} (Reasoning & Logika)
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {otherModels.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground font-bold uppercase tracking-wider border-t border-border/40 mt-1">
                                Model Fondasi Lainnya
                              </div>
                              {otherModels.map((m) => (
                                <SelectItem
                                  key={m.name}
                                  value={m.name}
                                  className="text-xs font-mono"
                                >
                                  {m.name}
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {ollamaStatus.models.length === 0 && (
                            <SelectItem value="er-ai-code:v1.0" className="text-xs font-mono">
                              er-ai-code:v1.0 (Default)
                            </SelectItem>
                          )}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Nama Model Hasil Latihan:
                </Label>
                <Input
                  value={targetModelName}
                  onChange={(e) => setTargetModelName(e.target.value)}
                  placeholder="er-ai-code:v1.0"
                  className="h-7.5 sm:h-8 text-xs font-mono font-medium focus-visible:ring-teal-500/40"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Mesin Analisa Arsitektur:
                </Label>
                <Select
                  value={analysisEngine}
                  onValueChange={(val) => setAnalysisEngine(val as "ollama" | "opencode")}
                >
                  <SelectTrigger className="h-7.5 sm:h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opencode" className="text-xs font-mono text-teal-400">
                      ⚡ OpenCode Free (nemotron-3.5-lightning-free)
                    </SelectItem>
                    <SelectItem value="ollama" className="text-xs font-mono">
                      🦙 Ollama Lokal ({selectedBaseModel})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-mono">
                    Context:
                  </Label>
                  <Input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(Number(e.target.value))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-mono">
                    Temp:
                  </Label>
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

        {/* Right Column: Templates, System Prompt Editor & Action Bar */}
        <div
          className={`flex flex-1 flex-col gap-3 overflow-hidden min-w-0 ${
            activeMobileView === "editor" ? "flex" : "hidden lg:flex"
          }`}
        >
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="py-2.5 px-3 sm:px-4 border-b border-border bg-muted/10 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <FileCode className="size-4 text-teal-500" />
                      <span>Editor Instruksi & Pengetahuan</span>
                    </CardTitle>
                    {projectData && (
                      <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-600 dark:text-teal-400 truncate max-w-[200px]">
                        {projectData.name}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Pilih template koding atau sesuaikan prompt sebelum model dilatihkan ke Ollama.
                  </CardDescription>
                </div>

                {hasExistingHabits && (
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <Switch
                      id="includeHabits"
                      size="sm"
                      checked={autoIncludeHabits}
                      onCheckedChange={(val) => {
                        setAutoIncludeHabits(val);
                        if (projectData) {
                          applyTemplateWithHabits(selectedTemplate, projectData, val);
                        }
                      }}
                    />
                    <Label
                      htmlFor="includeHabits"
                      className="text-[11px] text-muted-foreground font-normal cursor-pointer select-none"
                    >
                      Sertakan kebiasaan koding lama
                    </Label>
                  </div>
                )}
              </div>

              {/* Coding Template Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5 pt-2">
                {TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`flex flex-col items-start gap-0.5 rounded-lg border p-1.5 sm:p-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-xs"
                          : "border-border bg-card/60 hover:bg-muted/60 hover:border-teal-500/30 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium text-xs w-full">
                        <Icon
                          className={`size-3.5 shrink-0 ${
                            isSelected ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                          }`}
                        />
                        <span className={`truncate text-[11px] ${isSelected ? "font-semibold" : ""}`}>
                          {tpl.name}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground leading-snug">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col overflow-hidden p-2.5 sm:p-3.5 gap-2.5">
              {/* Textarea Editor */}
              <div className="flex flex-1 flex-col space-y-1 overflow-hidden min-h-[140px]">
                <div className="flex items-center justify-between shrink-0 px-0.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Instruksi Sistem (System Prompt):
                  </Label>
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
                  className="flex-1 font-mono text-xs leading-relaxed bg-background/80 resize-none min-h-[120px] border-border focus-visible:ring-teal-500/40 p-2.5 sm:p-3"
                />
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:items-center sm:justify-between border-t border-border shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyModelfile}
                    className="text-xs gap-1.5 h-8 hover:border-teal-500/40 hover:text-teal-500"
                    title="Salin format Modelfile lengkap"
                  >
                    <Copy className="size-3.5" />
                    <span className="hidden xs:inline">Salin</span> Modelfile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPrompt}
                    disabled={!systemPrompt.trim()}
                    className="text-xs gap-1.5 h-8 hover:border-teal-500/40 hover:text-teal-500"
                    title="Salin instruksi prompt ke clipboard"
                  >
                    <FileCode className="size-3.5" />
                    <span className="hidden xs:inline">Salin</span> Prompt
                  </Button>
                  <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono pl-1">
                    <ShieldCheck className="size-3.5" />
                    <span>Read-Only: File proyek aman 100%</span>
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    if (!projectPath) {
                      toast.error("Pilih folder proyek terlebih dahulu!");
                      return;
                    }
                    setIsTrainingModalOpen(true);
                    setTrainingStatus("running");
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
                        targetModelName: targetModelName.trim() || undefined,
                        analysisEngine,
                        opencodeModel: "opencode/nemotron-3.5-lightning-free",
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
                        if (res.project?.target_model_name) {
                          const match = res.project.target_model_name.match(/^(?:er-ai-code|er-ai):v?(\d+)\.(\d+)$/i);
                          if (match) {
                            const major = parseInt(match[1], 10);
                            const minor = parseInt(match[2], 10);
                            setTargetModelName(`er-ai-code:v${major}.${minor + 1}`);
                          }
                        }
                        await refreshQueue();
                        await refreshOllama();
                        toast.success(`Model "${res.project?.target_model_name || targetModelName}" berhasil dilatih & dianalisis!`);
                      } else {
                        setTrainingStatus("error");
                        setTrainingLogs((prev) => [
                          ...prev,
                          `[${new Date().toLocaleTimeString()}] [ERROR] ${res.message}`,
                        ]);
                      }
                    } catch (err: any) {
                      setTrainingStatus("error");
                      setTrainingLogs((prev) => [
                        ...prev,
                        `[${new Date().toLocaleTimeString()}] [ERROR] ${err.message}`,
                      ]);
                    }
                  }}
                  disabled={!systemPrompt.trim() || !projectPath}
                  className="gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-xs h-9 px-4"
                >
                  <Rocket className="size-4" />
                  Latih Proyek Ini Saja
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      ) : (
        <TrainerChatTab
          ollamaStatus={ollamaStatus}
          defaultModelName={targetModelName}
          projectQueue={projectQueue}
          onRefreshOllama={refreshOllama}
        />
      )}

      {/* Multi-Stage Animated Progress & Verification Plan Modal */}
      <Dialog
        open={isTrainingModalOpen}
        onOpenChange={(open) => {
          if (trainingStatus === "running") return;
          setIsTrainingModalOpen(open);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[680px] max-h-[88vh] p-0 flex flex-col overflow-hidden border border-border bg-card">
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/10">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
              {trainingStatus === "running" && (
                <Loader2 className="size-5 animate-spin text-teal-500" />
              )}
              {trainingStatus === "success" && (
                <CheckCircle2 className="size-5 text-teal-500" />
              )}
              {trainingStatus === "error" && (
                <AlertCircle className="size-5 text-destructive" />
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

          {/* Modal Content Scroll Area */}
          <ScrollArea className="flex-1 p-4 sm:p-5 space-y-4">
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
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2.5">
              {TRAINING_STAGES.map((stage) => {
                const isPast = currentStageId > stage.id || trainingStatus === "success";
                const isCurrent = currentStageId === stage.id && trainingStatus === "running";
                const isFailed = currentStageId === stage.id && trainingStatus === "error";

                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-2.5 rounded-md p-2 text-xs transition-colors ${
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
                      {isFailed && <AlertCircle className="size-4 text-destructive" />}
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

                {testPlanResult.tokensPerSec > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-border bg-background p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Zap className="size-3 text-amber-500" />
                        Kecepatan AI
                      </div>
                      <div className="text-xs font-mono font-bold text-foreground">
                        {testPlanResult.tokensPerSec}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">tok/s</span>
                      </div>
                    </div>

                    <div className="rounded border border-border bg-background p-2 text-center">
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

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-foreground">
                    Catatan & Evaluasi AI Terhadap Proyek:
                  </span>
                  <div className="rounded border border-teal-500/20 bg-background/80 p-2.5 font-mono text-[11px] leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap">
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
              <div className="rounded-lg bg-zinc-950 p-2.5 font-mono text-[11px] text-teal-400 max-h-28 overflow-y-auto border border-border space-y-0.5">
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
          </ScrollArea>

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 shrink-0">
            {trainingStatus === "running" ? (
              <span className="text-xs text-muted-foreground animate-pulse font-mono">
                Sedang memproses bertahap...
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsTrainingModalOpen(false);
                    setPushTargetModel(targetModelName);
                    setIsPushModalOpen(true);
                  }}
                  className="text-xs h-8 border-teal-500/40 text-teal-400 hover:bg-teal-500/10 gap-1.5"
                >
                  <UploadCloud className="size-3.5" />
                  <span>Push ke Hub</span>
                </Button>
                <Button
                  onClick={() => {
                    setIsTrainingModalOpen(false);
                    setActiveMainTab("chat");
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs h-8 shadow-xs gap-1.5"
                >
                  <Bot className="size-3.5" />
                  <span>Uji Model di Tab Chat AI &rarr;</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsTrainingModalOpen(false)}
                  className="text-xs h-8 border-border"
                >
                  Tutup
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OpenCode & Open-Source Free Coding Models Catalog Dialog */}
      <OpenCodeModelsDialog
        open={isOpenCodeModalOpen}
        onOpenChange={setIsOpenCodeModalOpen}
        installedModels={ollamaStatus.models}
        selectedBaseModel={selectedBaseModel}
        onSelectModel={(modelName) => setSelectedBaseModel(modelName)}
        onRefreshOllama={refreshOllama}
      />

      {/* Push Model to Ollama Hub / Export Modelfile Dialog */}
      <PushModelDialog
        open={isPushModalOpen}
        onOpenChange={setIsPushModalOpen}
        installedModels={ollamaStatus.models}
        defaultModel={pushTargetModel || targetModelName}
        onRefreshOllama={refreshOllama}
      />

      {/* AI Analysis Inspection Modal */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[640px] max-h-[85vh] p-0 flex flex-col overflow-hidden border border-border bg-card">
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/10">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
              <Sparkles className="size-4 text-teal-500" />
              Laporan Analisa Arsitektur AI — {selectedAnalysisProject?.project_name}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono truncate">
              {selectedAnalysisProject?.project_path}
            </DialogDescription>
          </DialogHeader>

          {selectedAnalysisProject && (
            <ScrollArea className="flex-1 p-4 sm:p-5 space-y-3">
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
                  <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-[10px]">
                    {Math.round(selectedAnalysisProject.tokens_per_sec)} tok/s
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border border-teal-500/20 bg-muted/20 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {selectedAnalysisProject.ai_analysis || "Belum ada analisa untuk proyek ini."}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/10 shrink-0">
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
