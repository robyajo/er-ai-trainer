import React, { useState } from "react";
import {
  Sparkles,
  Download,
  Check,
  CheckCircle2,
  Loader2,
  Cpu,
  Zap,
  Gauge,
  HardDrive,
  ExternalLink,
  Code2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { pullOllamaModel } from "@/actions/trainer";

export interface OpenCodeModelInfo {
  id: string;
  name: string;
  displayName: string;
  family: string;
  sizeTag: string;
  ramTag: string;
  speedTag: string;
  badge: string;
  badgeColor: string;
  description: string;
  tags: string[];
}

export const OPENCODE_MODELS_CATALOG: OpenCodeModelInfo[] = [
  {
    id: "opencoder-1.5b",
    name: "opencoder:1.5b",
    displayName: "OpenCoder 1.5B (OpenCode Free)",
    family: "RethinkLab / INF OpenCoder",
    sizeTag: "~980 MB",
    ramTag: "2 - 4 GB RAM",
    speedTag: "⚡ Super Cepat (~40-60 tok/s)",
    badge: "🌟 OpenCode Free",
    badgeColor: "border-teal-500/40 text-teal-400 bg-teal-500/10",
    description:
      "Model open-source murni untuk koding yang sangat hemat memori, cepat, dan 100% bebas lisensi terbuka. Ideal untuk laptop standar dan pelatihan instan.",
    tags: ["Open-Source", "Ringan", "TypeScript", "Python"],
  },
  {
    id: "opencoder-8b",
    name: "opencoder:8b",
    displayName: "OpenCoder 8B (Full Capability)",
    family: "RethinkLab / INF OpenCoder",
    sizeTag: "~4.8 GB",
    ramTag: "8 - 16 GB RAM",
    speedTag: "⚡ Cepat (~20-30 tok/s)",
    badge: "🚀 Deep Code Reasoning",
    badgeColor: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10",
    description:
      "Model OpenCoder skala penuh dengan penalaran algoritma kompleks, pemahaman dependensi modular, dan arsitektur software bertingkat.",
    tags: ["Advanced", "Architecture", "Full-Stack", "Modular"],
  },
  {
    id: "qwen-coder-7b",
    name: "qwen2.5-coder:7b",
    displayName: "Qwen 2.5 Coder 7B (Juara Open-Source)",
    family: "Qwen Open Source",
    sizeTag: "~4.7 GB",
    ramTag: "8 - 16 GB RAM",
    speedTag: "⚡ Sangat Cerdas & Presisi",
    badge: "🏆 Rekomendasi Utama",
    badgeColor: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    description:
      "Model koding open-source terpopuler dan terbaik saat ini. Sangat kuat dalam memahami Clean Code, refactoring, dan strict typing tanpa kompromi.",
    tags: ["Paling Cerdas", "Strict Types", "Clean Code", "Next.js"],
  },
  {
    id: "qwen-coder-1.5b",
    name: "qwen2.5-coder:1.5b",
    displayName: "Qwen 2.5 Coder 1.5B (Ultra-Light)",
    family: "Qwen Open Source",
    sizeTag: "~986 MB",
    ramTag: "2 - 4 GB RAM",
    speedTag: "⚡ Kilat (~50-70 tok/s)",
    badge: "⚡ Super Ringan",
    badgeColor: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    description:
      "Versi ringkas dari Qwen Coder untuk auto-completion responsif dan pembuatan boilerplate kode instan.",
    tags: ["Ultra-Fast", "React", "Node.js"],
  },
  {
    id: "deepseek-coder-1.3b",
    name: "deepseek-coder:1.3b",
    displayName: "DeepSeek Coder 1.3B",
    family: "DeepSeek AI",
    sizeTag: "~776 MB",
    ramTag: "2 GB RAM",
    speedTag: "⚡ Kilat",
    badge: "🧠 Algoritma",
    badgeColor: "border-rose-500/40 text-rose-400 bg-rose-500/10",
    description:
      "Model open-source dari DeepSeek dengan fokus efisiensi logika algoritma dasar, kalkulasi, dan sintaks kode.",
    tags: ["Math & Code", "Ringan", "Algoritma"],
  },
  {
    id: "qwen-1.5b-asisten",
    name: "qwen2.5:1.5b",
    displayName: "Qwen 2.5 1.5B (Basis er-ai-assistant)",
    family: "Qwen Open Source",
    sizeTag: "~986 MB",
    ramTag: "2 - 4 GB RAM",
    speedTag: "⚡ Kilat (~50-70 tok/s)",
    badge: "🤖 Basis er-ai-assistant",
    badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    description:
      "Model serbaguna untuk percakapan bahasa Indonesia yang natural, asisten harian, produktivitas, dan pemahaman instruksi. Basis resmi dari er-ai-assistant.",
    tags: ["Bahasa Indonesia", "Asisten", "Multitasking", "Hemat RAM"],
  },
  {
    id: "deepseek-r1-1.5b",
    name: "deepseek-r1:1.5b",
    displayName: "DeepSeek R1 1.5B (AI Reasoning & Thinking)",
    family: "DeepSeek AI",
    sizeTag: "~1.1 GB",
    ramTag: "2 - 4 GB RAM",
    speedTag: "🧠 Berpikir Mendalam (<think>)",
    badge: "🧠 Thinking Mode",
    badgeColor: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    description:
      "Model penalaran reasoning tingkat lanjut dengan output tag <think>...</think> sebelum menjawab. Sangat presisi untuk analisa logika, matematika, dan arsitektur.",
    tags: ["Reasoning", "Thinking Tag", "Analitis", "Logika"],
  },
  {
    id: "lfm-3-thinking",
    name: "lfm3",
    displayName: "LFM3 1.7B (Liquid Conversational Thinking)",
    family: "Liquid AI",
    sizeTag: "~1.7 GB",
    ramTag: "4 GB RAM",
    speedTag: "🌊 Liquid Neural Net",
    badge: "✨ Ollama v0.40.13+",
    badgeColor: "border-sky-500/40 text-sky-400 bg-sky-500/10",
    description:
      "Liquid Foundation Model untuk percakapan dinamis dengan kapabilitas berpikir (thinking). Memerlukan Ollama versi v0.40.13 atau lebih baru.",
    tags: ["Liquid AI", "Thinking", "Conversational", "Ollama v0.40.13+"],
  },
  {
    id: "lfm-3-omni-vision",
    name: "lfm3-omni",
    displayName: "LFM3 Omni (Basis er-ai-vision)",
    family: "Liquid AI",
    sizeTag: "~2.17 GB",
    ramTag: "4 - 8 GB RAM",
    speedTag: "👁️ Vision, Tools & Audio",
    badge: "👁️ Vision / Omni",
    badgeColor: "border-pink-500/40 text-pink-400 bg-pink-500/10",
    description:
      "Model multimodal Liquid Omni yang mendukung input visual citra, pemanggilan tools sistem, dan audio. Menjadi basis utama dari er-ai-vision (Perlu Ollama v0.40.13+).",
    tags: ["Vision", "Tools Calling", "Multimodal", "Ollama v0.40.13+"],
  },
];

export interface OpenCodeModelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedModels: Array<{ name: string; size: number }>;
  selectedBaseModel: string;
  onSelectModel: (modelName: string) => void;
  onRefreshOllama: () => Promise<void>;
}

export function OpenCodeModelsDialog({
  open,
  onOpenChange,
  installedModels,
  selectedBaseModel,
  onSelectModel,
  onRefreshOllama,
}: OpenCodeModelsDialogProps) {
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(
    null
  );

  const isModelInstalled = (modelName: string) => {
    return installedModels.some(
      (m) =>
        m.name.toLowerCase() === modelName.toLowerCase() ||
        m.name.toLowerCase().startsWith(modelName.toLowerCase() + ":")
    );
  };

  const handleDownloadModel = async (model: OpenCodeModelInfo) => {
    setDownloadingModelId(model.id);
    toast.info(
      `Memulai pengunduhan ${model.displayName} ke Ollama lokal... Harap tunggu beberapa saat.`
    );

    try {
      const res = await pullOllamaModel(model.name);
      if (res.success) {
        toast.success(
          `Model ${model.displayName} berhasil diunduh dan dipasang ke Ollama!`
        );
        await onRefreshOllama();
        onSelectModel(model.name);
        onOpenChange(false);
      } else {
        if (res.message && res.message.includes("requires ollama version")) {
          toast.error(
            `Gagal mengunduh ${model.name}: Memerlukan Ollama v0.40.13+. Silakan jalankan "curl -fsSL https://ollama.com/install.sh | sh" di terminal host Anda.`,
            { duration: 8000 }
          );
        } else {
          toast.error(`Gagal mengunduh: ${res.message}`);
        }
      }
    } catch (err: any) {
      toast.error(`Error pengunduhan: ${err.message}`);
    } finally {
      setDownloadingModelId(null);
    }
  };

  const handleSelectInstalled = (modelName: string) => {
    // Find the exact name matching installed
    const found = installedModels.find(
      (m) =>
        m.name.toLowerCase() === modelName.toLowerCase() ||
        m.name.toLowerCase().startsWith(modelName.toLowerCase() + ":")
    );
    const chosen = found ? found.name : modelName;
    onSelectModel(chosen);
    toast.success(`Model dasar diatur ke: ${chosen}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[88vh] p-0 flex flex-col overflow-hidden border border-border bg-card">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Code2 className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Katalog Model OpenCode & Open-Source Gratis</span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-teal-500/30 text-teal-400 bg-teal-500/5 font-mono"
                >
                  100% Free
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pilih atau unduh model koding open-source gratis (OpenCoder, Qwen-Coder, DeepSeek) langsung ke Ollama lokal Anda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Models List */}
        <ScrollArea className="flex-1 max-h-[60vh] sm:max-h-[500px] p-3 sm:p-4.5 space-y-2.5 sm:space-y-3">
          {OPENCODE_MODELS_CATALOG.map((model) => {
            const installed = isModelInstalled(model.name);
            const isCurrentlySelected =
              selectedBaseModel.toLowerCase().includes(model.name.toLowerCase());
            const isDownloading = downloadingModelId === model.id;

            return (
              <Card
                key={model.id}
                className={`p-3.5 transition-all border ${
                  isCurrentlySelected
                    ? "border-teal-500/60 bg-teal-500/5 shadow-xs"
                    : "border-border/70 bg-card/60 hover:bg-card hover:border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-foreground font-mono">
                        {model.displayName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-1.5 py-0 ${model.badgeColor}`}
                      >
                        {model.badge}
                      </Badge>
                      {installed && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono px-1.5 py-0 border-emerald-500/40 text-emerald-400 bg-emerald-500/10 flex items-center gap-1"
                        >
                          <Check className="size-2.5" />
                          Terpasang
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {model.description}
                    </p>

                    {/* Metadata Telemetry Badges */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="size-3 text-teal-400" />
                        {model.sizeTag}
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu className="size-3 text-teal-400" />
                        {model.ramTag}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="size-3 text-teal-400" />
                        {model.speedTag}
                      </span>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="flex items-center sm:self-center shrink-0">
                    {installed ? (
                      <Button
                        size="sm"
                        disabled={isCurrentlySelected}
                        onClick={() => handleSelectInstalled(model.name)}
                        className={`h-8 text-xs font-mono gap-1.5 ${
                          isCurrentlySelected
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 cursor-default"
                            : "bg-teal-600 hover:bg-teal-500 text-white shadow-xs"
                        }`}
                      >
                        {isCurrentlySelected ? (
                          <>
                            <CheckCircle2 className="size-3.5 text-teal-400" />
                            <span>Model Aktif</span>
                          </>
                        ) : (
                          <>
                            <Zap className="size-3.5" />
                            <span>Gunakan Model Ini</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isDownloading || downloadingModelId !== null}
                        onClick={() => handleDownloadModel(model)}
                        className="h-8 text-xs font-mono gap-1.5 bg-card hover:bg-muted text-foreground border border-teal-500/40 hover:border-teal-500 shadow-xs"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin text-teal-400" />
                            <span>Mengunduh...</span>
                          </>
                        ) : (
                          <>
                            <Download className="size-3.5 text-teal-400" />
                            <span>Unduh ke Ollama (Gratis)</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </ScrollArea>

        {/* Footer Note */}
        <div className="p-3 sm:p-4 border-t border-border/80 bg-muted/10 shrink-0 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Semua model di atas 100% open-source, bebas biaya, & berjalan lokal via Ollama.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
