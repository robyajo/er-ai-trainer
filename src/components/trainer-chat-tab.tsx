import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  Terminal,
  Zap,
  Code2,
  FolderGit2,
  Cpu,
  Layers,
  Wand2,
  UploadCloud,
  Image as ImageIcon,
  Mic,
  MicOff,
  X,
} from "lucide-react";
import { ChatMessageContent } from "./chat-message-content";
import { ImageEditorDialog } from "./image-editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { chatWithModel, getOpenCodeStatus, runOpenCodePrompt } from "@/actions/trainer";
import type { ProjectRecord } from "@/ipc/db/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PushModelDialog } from "@/components/push-model-dialog";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  tokensPerSec?: number;
  durationMs?: number;
  evalCount?: number;
  images?: string[];
}

interface TestTemplate {
  id: string;
  category: "architecture" | "cleancode" | "audit" | "implementation";
  title: string;
  badge: string;
  description: string;
  prompt: (projectName: string) => string;
}

const TEST_TEMPLATES: TestTemplate[] = [
  {
    id: "arch-summary",
    category: "architecture",
    title: "1. Uji Pemahaman Arsitektur & Struktur Folder",
    badge: "Arsitektur",
    description: "Menguji apakah model mengenali susunan direktori dan arsitektur layer proyek.",
    prompt: (name) =>
      `Jelaskan ringkasan struktur folder utama, arsitektur layer, dan pola desain dari proyek yang sudah kamu pelajari!`,
  },
  {
    id: "tech-conventions",
    category: "architecture",
    title: "2. Uji Konvensi & Standar Koding Spesifik",
    badge: "Konvensi",
    description: "Memverifikasi aturan styling, TypeScript type-safety, dan konvensi penamaan.",
    prompt: (name) =>
      `Sebutkan 3 aturan koding terpenting dan konvensi teknologi yang harus saya patuhi saat menulis kode baru di proyek ini!`,
  },
  {
    id: "code-generation",
    category: "implementation",
    title: "3. Uji Pembuatan Fitur Sesuai Gaya Proyek",
    badge: "Implementasi",
    description: "Meminta AI membuat komponen / service baru yang selaras dengan file yang ada.",
    prompt: (name) =>
      `Buatkan satu contoh modul atau komponen baru yang sesuai persis dengan struktur folder, styling, dan pola arsitektur proyek ini! Sertakan tipe data TypeScript yang ketat.`,
  },
  {
    id: "security-audit",
    category: "audit",
    title: "4. Uji Audit Keamanan & Risiko Dependensi",
    badge: "Security",
    description: "Mengevaluasi rekomendasi keamanan berdasarkan stack dan konfigurasi paket.",
    prompt: (name) =>
      `Apa saja potensi risiko keamanan, bottleneck performa, dan rekomendasi standar optimasi untuk proyek ini?`,
  },
  {
    id: "refactoring-advice",
    category: "cleancode",
    title: "5. Uji Refactoring & Clean Code",
    badge: "Clean Code",
    description: "Menilai kemampuan AI menyarankan refactor tanpa merusak modul yang ada.",
    prompt: (name) =>
      `Bagaimana strategi refactoring terbaik untuk meningkatkan modularitas dan maintainability pada proyek ini tanpa merusak fitur yang sedang berjalan?`,
  },
  {
    id: "integration-testing",
    category: "implementation",
    title: "6. Uji Pola Pengujian (Unit / Integration)",
    badge: "Testing",
    description: "Meminta saran pengujian yang sesuai dengan stack proyek.",
    prompt: (name) =>
      `Berikan contoh pengujian (unit test) yang tepat untuk salah satu fungsi utama di proyek ini dengan library testing yang sesuai stack.`,
  },
];

interface TrainerChatTabProps {
  ollamaStatus: {
    online: boolean;
    models: Array<{ name: string; size: number }>;
  };
  defaultModelName?: string;
  projectQueue: ProjectRecord[];
  onRefreshOllama: () => void;
}

export function TrainerChatTab({
  ollamaStatus,
  defaultModelName,
  projectQueue,
  onRefreshOllama,
}: TrainerChatTabProps) {
  const [engineProvider, setEngineProvider] = useState<"ollama" | "opencode">("ollama");
  const [openCodeStatus, setOpenCodeStatus] = useState<{
    available: boolean;
    models: string[];
    freeModels: string[];
  }>({ available: false, models: [], freeModels: [] });
  const [selectedOpenCodeModel, setSelectedOpenCodeModel] = useState<string>(
    "opencode/nemotron-3.5-lightning-free"
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    defaultModelName || "er-ai-code:v1.0"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedProjectContext, setSelectedProjectContext] =
    useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState<boolean>(false);
  const [attachedImages, setAttachedImages] = useState<
    Array<{ id: string; dataUrl: string; base64: string; name: string }>
  >([]);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const openEditorOnUploadRef = useRef<boolean>(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  const handleSaveEditedImage = (dataUrl: string, caption?: string) => {
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: caption || "Berikut adalah gambar hasil modifikasi latar belakang hitam pekat:",
      timestamp: new Date().toLocaleTimeString(),
      images: [dataUrl],
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`File "${file.name}" bukan gambar.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Ukuran file "${file.name}" melebihi batas 10 MB.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const base64 = dataUrl.split(",")[1];
          setAttachedImages((prev) => [
            ...prev,
            { id: `img-${Date.now()}-${Math.random()}`, dataUrl, base64, name: file.name },
          ]);
          if (openEditorOnUploadRef.current) {
            setEditorImageSrc(dataUrl);
            openEditorOnUploadRef.current = false;
          }
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              const base64 = dataUrl.split(",")[1];
              setAttachedImages((prev) => [
                ...prev,
                { id: `img-${Date.now()}-${Math.random()}`, dataUrl, base64, name: file.name || "Tangkapan Layar" },
              ]);
              toast.success("Gambar dari clipboard berhasil dilampirkan.");
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  const removeAttachedImage = (id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Input suara (Speech Recognition) tidak didukung pada sistem/environment ini.");
      return;
    }

    if (isListeningVoice) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        toast.info("Mendengarkan suara... Silakan berbicara.");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          toast.success("Suara berhasil diterjemahkan ke teks!");
        }
      };

      recognition.onerror = (event: any) => {
        setIsListeningVoice(false);
        if (event.error !== "no-speech") {
          toast.error(`Error suara: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListeningVoice(false);
      toast.error(`Gagal memulai rekaman suara: ${err.message}`);
    }
  };

  // Active project calculation
  const activeProject =
    projectQueue.find((p) => p.project_path === selectedProjectContext) ||
    projectQueue.find((p) => p.status === "completed") ||
    projectQueue[0];

  const activeProjectName = activeProject ? activeProject.project_name : "proyek ini";

  // Auto-select latest completed project on mount or queue update
  useEffect(() => {
    if (selectedProjectContext === "all" && projectQueue.length > 0) {
      const latest = projectQueue.find((p) => p.status === "completed");
      if (latest) {
        setSelectedProjectContext(latest.project_path);
      }
    }
  }, [projectQueue, selectedProjectContext]);

  // Fetch OpenCode CLI status on mount
  useEffect(() => {
    getOpenCodeStatus().then((status) => {
      setOpenCodeStatus(status);
      if (status.freeModels && status.freeModels.length > 0) {
        setSelectedOpenCodeModel(status.freeModels[0]);
      } else if (status.models && status.models.length > 0) {
        setSelectedOpenCodeModel(status.models[0]);
      }
    });
  }, []);

  // Sync defaultModelName or auto-select latest er-ai version
  useEffect(() => {
    if (defaultModelName && ollamaStatus.models.some((m) => m.name === defaultModelName)) {
      setSelectedModel(defaultModelName);
    } else if (ollamaStatus.models.length > 0) {
      // Find latest er-ai-code:v* or er-ai-assistant:v* or legacy er-ai:v*
      const erAiModels = ollamaStatus.models.filter(
        (m) =>
          m.name.startsWith("er-ai-code") ||
          m.name.startsWith("er-ai-assistant") ||
          m.name.startsWith("er-ai-vision") ||
          m.name.startsWith("er-ai:") ||
          m.name === "er-ai"
      );
      if (erAiModels.length > 0) {
        let highestMajor = -1;
        let highestMinor = -1;
        let newest = erAiModels[0].name;
        for (const m of erAiModels) {
          const match = m.name.match(/^(?:er-ai-code|er-ai):v?(\d+)\.(\d+)$/i);
          if (match) {
            const major = parseInt(match[1], 10);
            const minor = parseInt(match[2], 10);
            if (major > highestMajor || (major === highestMajor && minor > highestMinor)) {
              highestMajor = major;
              highestMinor = minor;
              newest = m.name;
            }
          }
        }
        setSelectedModel(newest);
      } else if (!selectedModel || !ollamaStatus.models.some((m) => m.name === selectedModel)) {
        setSelectedModel(ollamaStatus.models[0].name);
      }
    }
  }, [defaultModelName, ollamaStatus.models]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? inputMessage).trim();
    if ((!content && attachedImages.length === 0) || isLoading) return;

    if (!ollamaStatus.online) {
      toast.error("Ollama sedang offline! Pastikan service Ollama berjalan.");
      return;
    }

    const currentImages = [...attachedImages];
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content || "(Mengirim lampiran gambar)",
      timestamp: new Date().toLocaleTimeString(),
      images: currentImages.length > 0 ? currentImages.map((img) => img.dataUrl) : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    try {
      // Build conversation history for /api/chat
      const apiMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
        images?: string[];
      }> = [];

      if (activeProject && activeProject.system_prompt) {
        apiMessages.push({
          role: "system",
          content: activeProject.system_prompt,
        });
      }

      // Append last 10 dialog turns for conversational context
      for (const m of newMessages.slice(-10)) {
        if (m.role === "user" || m.role === "assistant") {
          apiMessages.push({
            role: m.role,
            content: m.content,
            images: m.images && m.images.length > 0
              ? m.images.map((img) => img.includes(",") ? img.split(",")[1] : img)
              : undefined,
          });
        }
      }

      if (engineProvider === "opencode") {
        const fullPrompt = `${activeProject?.system_prompt ? `[PANDUAN PROYEK:\n${activeProject.system_prompt.slice(0, 500)}]\n\n` : ""}Pertanyaan Pengguna: ${content}`;
        const res = await runOpenCodePrompt({
          modelName: selectedOpenCodeModel,
          prompt: fullPrompt,
          projectPath: activeProject?.project_path,
        });

        if (res.success && res.response) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: res.response,
            timestamp: new Date().toLocaleTimeString(),
            tokensPerSec: Math.round((res.response.length / 4) / Math.max(0.5, res.durationMs / 1000)),
            durationMs: res.durationMs,
            evalCount: Math.round(res.response.length / 4),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          toast.error(`Gagal respon: ${res.error || "OpenCode error"}`);
        }
      } else {
        const res = await chatWithModel({
          modelName: selectedModel || "er-ai-code:v1.0",
          messages: apiMessages,
          temperature: 0.3,
        });

        if (res.success && res.message) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: res.message,
            timestamp: new Date().toLocaleTimeString(),
            tokensPerSec: res.tokensPerSec,
            durationMs: res.durationMs,
            evalCount: res.evalCount,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          toast.error(res.error || "Gagal mendapatkan respon dari Ollama");
        }
      }
    } catch (err: any) {
      toast.error(`Terjadi kesalahan saat chat: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleUseTemplate = (tmpl: TestTemplate) => {
    const text = tmpl.prompt(activeProjectName);
    handleSendMessage(text);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Kode disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.info("Riwayat chat dibersihkan.");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Subheader Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border/60 bg-muted/15 backdrop-blur-xs shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Engine Provider Switcher */}
          <div className="flex items-center rounded-md border border-border/70 p-0.5 bg-background/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setEngineProvider("ollama")}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                engineProvider === "ollama"
                  ? "bg-teal-500/20 text-teal-300 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="size-3 text-teal-400" />
              <span>Ollama</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!openCodeStatus.available) {
                  toast.error("OpenCode CLI belum terpasang di sistem!");
                  return;
                }
                setEngineProvider("opencode");
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                engineProvider === "opencode"
                  ? "bg-amber-500/20 text-amber-300 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="size-3 text-amber-400" />
              <span>OpenCode</span>
              {openCodeStatus.freeModels && openCodeStatus.freeModels.length > 0 && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded uppercase tracking-wider font-mono">
                  Free
                </span>
              )}
            </button>
          </div>

          {/* Model Selector based on provider */}
          <div className="flex items-center gap-1">
            {engineProvider === "ollama" ? (
              <Select
                value={selectedModel}
                onValueChange={(val) => setSelectedModel(val)}
              >
                <SelectTrigger className="h-7.5 text-xs font-mono min-w-[140px] max-w-[210px] bg-background/80 border-border/70">
                  <SelectValue placeholder="Pilih model..." />
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
                                💻 {m.name} (Koding)
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
            ) : (
              <Select
                value={selectedOpenCodeModel}
                onValueChange={(val) => setSelectedOpenCodeModel(val)}
              >
                <SelectTrigger className="h-7.5 text-xs font-mono min-w-[160px] max-w-[240px] bg-background/80 border-border/70">
                  <SelectValue placeholder="Pilih model OpenCode..." />
                </SelectTrigger>
                <SelectContent>
                  {openCodeStatus.freeModels && openCodeStatus.freeModels.length > 0 && (
                    <div className="px-2 py-1 text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">
                      ★ Model OpenCode Gratis (Free)
                    </div>
                  )}
                  {openCodeStatus.freeModels.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs font-mono text-teal-300">
                      ✨ {m}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground font-bold uppercase tracking-wider border-t border-border/40 mt-1">
                    Semua Model OpenCode
                  </div>
                  {openCodeStatus.models
                    .filter((m) => !openCodeStatus.freeModels.includes(m))
                    .map((m) => (
                      <SelectItem key={m} value={m} className="text-xs font-mono">
                        {m}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Project Context Injector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
              Konteks Proyek:
            </span>
            <Select
              value={selectedProjectContext}
              onValueChange={(val) => setSelectedProjectContext(val)}
            >
              <SelectTrigger className="h-7.5 text-xs font-mono min-w-[130px] max-w-[190px] bg-background/80 border-border/70">
                <SelectValue placeholder="Pilih konteks..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-mono">
                  🌐 Semua Pengetahuan Proyek
                </SelectItem>
                {projectQueue.map((p) => (
                  <SelectItem
                    key={p.project_path}
                    value={p.project_path}
                    className="text-xs font-mono"
                  >
                    📂 {p.project_name} {p.status === "completed" ? "✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateDrawerOpen(true)}
            className="h-7 px-2 text-xs text-teal-400 border-teal-500/30 flex lg:hidden gap-1 font-mono hover:bg-teal-500/10"
            title="Buka Template Uji Pengetahuan"
          >
            <Sparkles className="size-3" />
            <span className="hidden xs:inline">Uji</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPushModalOpen(true)}
            className="h-7 px-2 sm:px-2.5 text-xs text-teal-400 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15 gap-1 font-medium"
            title="Push model pilihan ke Ollama Hub atau ekspor file Modelfile"
          >
            <UploadCloud className="size-3" />
            <span className="hidden sm:inline">Push ke Hub</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshOllama}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Segarkan daftar model"
          >
            <RotateCcw className="size-3" />
            <span className="hidden md:inline ml-1">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            title="Bersihkan riwayat percakapan"
          >
            <span>Bersihkan</span>
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Templates Sidebar + Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer / Panel: Knowledge Test Templates */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 border-r border-border/60 bg-muted/10 shrink-0">
          <div className="px-3.5 py-2.5 border-b border-border/50 bg-background/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-teal-400" />
              <span className="text-xs font-semibold tracking-wide uppercase font-mono">
                Template Uji Pengetahuan
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] py-0 font-mono">
              {TEST_TEMPLATES.length} Uji
            </Badge>
          </div>

          <ScrollArea className="flex-1 px-2.5 py-2">
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground px-1 pb-1">
                Pilih template untuk menguji live respon model terhadap arsitektur dan aturan koding proyek:
              </p>
              {TEST_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleUseTemplate(tmpl)}
                  className="group relative p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/40 hover:border-teal-500/50 cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium group-hover:text-teal-300 transition-colors line-clamp-1">
                      {tmpl.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] py-0 px-1 font-mono shrink-0 uppercase bg-teal-500/10 text-teal-300 border-teal-500/30"
                    >
                      {tmpl.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-teal-400/80 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Klik untuk kirim prompt uji</span>
                    <ChevronRight className="size-3" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Section: Chat Conversation Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {/* Messages Scroll Area */}
          <ScrollArea className="flex-1 px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[420px] text-center max-w-xl mx-auto px-4">
                <div className="size-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 shadow-sm">
                  <Bot className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">
                  Studio Pengujian & Chat Live ER-AI
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Uji pemahaman dan kecerdasan model yang telah dilatih dengan pertanyaan langsung atau gunakan template uji pengetahuan di panel samping.
                </p>

                {/* Quick chip buttons for smaller screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                  {TEST_TEMPLATES.slice(0, 4).map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleUseTemplate(tmpl)}
                      className="flex items-start gap-2 p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/50 hover:border-teal-500/40 text-left transition-colors"
                    >
                      <Sparkles className="size-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-foreground">{tmpl.badge}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {tmpl.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role !== "user" && (
                      <div className="size-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                        <Bot className="size-4" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-teal-600 text-white font-sans shadow-sm"
                          : "bg-card border border-border/70 text-foreground font-sans shadow-xs"
                      }`}
                    >
                      {/* Message Content with Thinking, Markdown & Syntax Highlighting */}
                      <ChatMessageContent
                        content={m.content}
                        role={m.role}
                        images={m.images}
                        onSaveEditedImage={handleSaveEditedImage}
                      />

                      {/* Assistant Telemetry footer */}
                      {m.role === "assistant" && (
                        <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between gap-2 text-[10px] text-muted-foreground font-mono">
                          <div className="flex items-center gap-2">
                            {m.tokensPerSec !== undefined && (
                              <span className="text-teal-400 font-medium">
                                {m.tokensPerSec} tok/s
                              </span>
                            )}
                            {m.durationMs !== undefined && (
                              <span>{m.durationMs}ms</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <span>{m.timestamp}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(m.content, m.id)}
                              className="p-1 hover:text-foreground rounded"
                              title="Salin Pesan"
                            >
                              {copiedId === m.id ? (
                                <Check className="size-3 text-teal-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* User timestamp */}
                      {m.role === "user" && (
                        <div className="mt-1 text-right text-[10px] text-white/70 font-mono">
                          {m.timestamp}
                        </div>
                      )}
                    </div>

                    {m.role === "user" && (
                      <div className="size-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="size-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
                      <Bot className="size-4" />
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-card border border-border/70 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <div className="size-2 rounded-full bg-teal-400 animate-pulse" />
                      <span>{selectedModel} sedang berpikir & merespon...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Chat Input Box */}
          <div className="p-3 border-t border-border/60 bg-muted/15 shrink-0">
            <div className="max-w-3xl mx-auto">
              {/* Attached Images Preview Strip */}
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-card/80 border border-border/70">
                  <span className="text-[10px] font-mono text-muted-foreground w-full">
                    Gambar Terlampir ({attachedImages.length}):
                  </span>
                  {attachedImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-md overflow-hidden border border-border/80 size-14 bg-zinc-950"
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachedImage(img.id)}
                        className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors z-10"
                        title="Hapus gambar"
                      >
                        <X className="size-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorImageSrc(img.dataUrl)}
                        className="absolute bottom-0.5 right-0.5 size-4 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-colors z-10"
                        title="Edit Latar Belakang / Buka Studio"
                      >
                        <Wand2 className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-end gap-2 bg-card border border-border/80 focus-within:border-teal-500/60 rounded-xl p-1.5 shadow-xs transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Tanya apa saja tentang arsitektur, clean code, kirim gambar, atau minta kode baru ke ${selectedModel}...`}
                  rows={2}
                  disabled={isLoading}
                  className="min-h-[50px] max-h-[160px] text-xs resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent py-1.5 px-2 font-sans"
                />

                <div className="flex items-center gap-1 shrink-0 mb-1">
                  {/* Attach Image button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="size-8 p-0 text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 rounded-lg shrink-0"
                    title="Lampirkan Gambar (Vision)"
                  >
                    <ImageIcon className="size-4" />
                    <span className="sr-only">Lampirkan Gambar</span>
                  </Button>

                  {/* Open Image Studio Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (attachedImages.length > 0) {
                        setEditorImageSrc(attachedImages[0].dataUrl);
                      } else {
                        const lastChatImage = messages
                          .slice()
                          .reverse()
                          .find((m) => m.images && m.images.length > 0)?.images?.[0];
                        if (lastChatImage) {
                          setEditorImageSrc(lastChatImage);
                          toast.info("Membuka gambar dari riwayat percakapan ke Studio Editor...");
                        } else {
                          openEditorOnUploadRef.current = true;
                          fileInputRef.current?.click();
                        }
                      }
                    }}
                    disabled={isLoading}
                    className="size-8 p-0 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-lg shrink-0"
                    title="Buka Studio Edit Latar Belakang AI"
                  >
                    <Wand2 className="size-4" />
                    <span className="sr-only">Edit Latar Belakang</span>
                  </Button>

                  {/* Voice Dictation (STT) button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleVoiceRecording}
                    disabled={isLoading}
                    className={`size-8 p-0 rounded-lg shrink-0 transition-all ${
                      isListeningVoice
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse"
                        : "text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10"
                    }`}
                    title={isListeningVoice ? "Sedang merekam... Klik untuk selesai" : "Dikte Suara (Voice Input)"}
                  >
                    {isListeningVoice ? (
                      <MicOff className="size-4 text-rose-400" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                    <span className="sr-only">Input Suara</span>
                  </Button>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={(!inputMessage.trim() && attachedImages.length === 0) || isLoading}
                    className="h-8 px-3 bg-teal-600 hover:bg-teal-500 text-white shrink-0 rounded-lg"
                  >
                    <Send className="size-3.5" />
                    <span className="sr-only">Kirim</span>
                  </Button>
                </div>
              </form>

              <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-muted-foreground font-mono">
                <span>
                  Target Inference:{" "}
                  <strong className="text-teal-400 font-semibold">{selectedModel}</strong>
                </span>
                <span>Tekan Enter untuk kirim, Shift+Enter untuk baris baru</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Template Selection Dialog (For < lg) */}
      <Dialog open={isTemplateDrawerOpen} onOpenChange={setIsTemplateDrawerOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[560px] max-h-[85vh] p-0 flex flex-col overflow-hidden border border-border bg-card">
          <DialogHeader className="p-3.5 sm:p-4 border-b border-border bg-muted/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">
                  Template Uji Pengetahuan ER-AI
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Pilih salah satu pengujian untuk langsung dikirimkan ke model {selectedModel}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] p-3 sm:p-4 space-y-2">
            <div className="space-y-2">
              {TEST_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    handleUseTemplate(tmpl);
                    setIsTemplateDrawerOpen(false);
                  }}
                  className="group relative p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-teal-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold group-hover:text-teal-400 transition-colors">
                      {tmpl.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] py-0 px-1 font-mono shrink-0 uppercase bg-teal-500/10 text-teal-300 border-teal-500/30"
                    >
                      {tmpl.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <PushModelDialog
        open={isPushModalOpen}
        onOpenChange={setIsPushModalOpen}
        installedModels={ollamaStatus.models}
        defaultModel={selectedModel}
        onRefreshOllama={onRefreshOllama}
      />
    </div>
  );
}
