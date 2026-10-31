import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  FileCode,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Terminal,
  Laptop,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getOllamaPublicKey,
  pushOllamaModel,
  exportModelfile,
  saveModelfileToDisk,
} from "@/actions/trainer";
import { openExternalLink } from "@/actions/shell";

interface PushModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedModels: Array<{ name: string; size: number }>;
  defaultModel?: string;
  onRefreshOllama?: () => void;
}

export function PushModelDialog({
  open,
  onOpenChange,
  installedModels,
  defaultModel,
  onRefreshOllama,
}: PushModelDialogProps) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [customTag, setCustomTag] = useState<string>("");

  // SSH Key state
  const [publicKeyInfo, setPublicKeyInfo] = useState<{
    exists: boolean;
    keyPath: string;
    publicKey: string | null;
    connectUrl?: string | null;
    isSystemService?: boolean;
  }>({ exists: false, keyPath: "", publicKey: null, connectUrl: null, isSystemService: false });

  // Push status state
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<boolean>(false);

  // Modelfile Export State
  const [modelfileContent, setModelfileContent] = useState<string>("");
  const [isLoadingModelfile, setIsLoadingModelfile] = useState<boolean>(false);
  const [copiedModelfile, setCopiedModelfile] = useState<boolean>(false);

  // Load public key and set default model on open
  useEffect(() => {
    if (open) {
      getOllamaPublicKey().then((res) => setPublicKeyInfo(res));

      // Choose default model: prefer er-ai:v* if available
      const erAiModels = installedModels.filter(
        (m) =>
          m.name.startsWith("er-ai-code") ||
          m.name.startsWith("er-ai-assistant") ||
          m.name.startsWith("er-ai-vision") ||
          m.name.startsWith("er-ai:") ||
          m.name === "er-ai"
      );
      if (defaultModel && installedModels.some((m) => m.name === defaultModel)) {
        setSelectedModel(defaultModel);
      } else if (erAiModels.length > 0) {
        setSelectedModel(erAiModels[0].name);
      } else if (installedModels.length > 0) {
        setSelectedModel(installedModels[0].name);
      }

      setPushStatus("idle");
      setStatusMessage("");
    }
  }, [open, defaultModel, installedModels]);

  // Sync custom tag with selectedModel (always strip any username prefix)
  useEffect(() => {
    if (selectedModel) {
      const cleanTag = selectedModel.includes("/") ? selectedModel.split("/").pop()! : selectedModel;
      setCustomTag(cleanTag);
      setIsLoadingModelfile(true);
      exportModelfile(selectedModel)
        .then((res) => {
          if (res.success && res.modelfile) {
            setModelfileContent(res.modelfile);
          } else {
            setModelfileContent("");
          }
        })
        .finally(() => setIsLoadingModelfile(false));
    }
  }, [selectedModel]);

  // Derived target repository string (ensures no duplicate username prefix)
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const baseTag = (customTag.trim() || selectedModel).replace(/^[^/]+\//, "");
  const targetRepo = cleanUsername
    ? `${cleanUsername}/${baseTag}`
    : baseTag;

  const handleCopyKey = () => {
    if (publicKeyInfo.publicKey) {
      navigator.clipboard.writeText(publicKeyInfo.publicKey);
      setCopiedKey(true);
      toast.success("Kunci Publik Ollama disalin ke clipboard!");
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleOpenKeysPage = () => {
    openExternalLink("https://ollama.com/settings/keys");
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    toast.success("Perintah disalin ke clipboard!");
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handlePush = async () => {
    if (!selectedModel) {
      toast.error("Pilih model yang ingin di-push!");
      return;
    }
    if (!cleanUsername) {
      toast.error("Masukkan username Ollama Anda terlebih dahulu!");
      return;
    }

    setIsPushing(true);
    setPushStatus("running");
    setStatusMessage(`Menyiapkan dan mem-push \"${targetRepo}\" ke Ollama Hub...`);

    try {
      const res = await pushOllamaModel({
        sourceModel: selectedModel,
        targetModel: targetRepo,
      });

      if (res.success) {
        setPushStatus("success");
        setStatusMessage(res.message);
        toast.success(`Model \"${targetRepo}\" berhasil di-push ke Ollama Hub!`);
        if (onRefreshOllama) onRefreshOllama();
      } else {
        setPushStatus("error");
        setStatusMessage(res.message);
        toast.error("Gagal mem-push model ke Ollama Hub");
      }
    } catch (err: any) {
      setPushStatus("error");
      setStatusMessage(err.message || "Gagal menghubungi Ollama");
      toast.error(err.message || "Terjadi kesalahan saat push");
    } finally {
      setIsPushing(false);
    }
  };

  const handleSaveModelfile = async () => {
    if (!modelfileContent) return;
    try {
      const res = await saveModelfileToDisk({
        modelName: selectedModel,
        content: modelfileContent,
      });
      if (!res.canceled && res.filePath) {
        toast.success(`Modelfile berhasil disimpan ke: ${res.filePath}`);
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan file: ${err.message}`);
    }
  };

  const handleCopyModelfile = () => {
    if (!modelfileContent) return;
    navigator.clipboard.writeText(modelfileContent);
    setCopiedModelfile(true);
    toast.success("Isi Modelfile disalin!");
    setTimeout(() => setCopiedModelfile(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[620px] max-h-[92vh] sm:max-h-[86vh] p-0 flex flex-col overflow-hidden border border-border bg-card shadow-2xl">
        {/* Header with safe padding for close button */}
        <DialogHeader className="p-3.5 sm:p-4.5 pr-10 sm:pr-12 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <UploadCloud className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                Pasang AI di Device Lain (Push Hub)
              </DialogTitle>
              <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                Upload ke Ollama Hub atau ekspor file agar bisa dijalankan di laptop lain.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="push" className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Responsive Tab Bar */}
          <div className="px-3 sm:px-4 pt-2.5 pb-1 border-b border-border/60 bg-muted/5 shrink-0">
            <TabsList className="h-8 p-0.5 bg-muted/60 w-full grid grid-cols-2">
              <TabsTrigger
                value="push"
                className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-teal-400 font-medium truncate"
              >
                <UploadCloud className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Upload / Push ke Ollama Hub</span>
                <span className="inline sm:hidden">Push ke Hub</span>
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-teal-400 font-medium truncate"
              >
                <FileCode className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Ekspor Modelfile (Offline)</span>
                <span className="inline sm:hidden">Ekspor Offline</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: PUSH TO OLLAMA HUB */}
          <TabsContent
            value="push"
            className="flex-1 overflow-y-auto p-3 sm:p-4.5 space-y-3 sm:space-y-3.5 m-0 focus-visible:outline-none"
          >
            {/* 1. Pilih Model Lokal */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Label className="text-xs font-semibold text-foreground">
                  1. Pilih Model Lokal:
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-400">
                  Tersedia di PC
                </Badge>
              </div>
              <Select
                value={selectedModel}
                onValueChange={(val) => setSelectedModel(val)}
                disabled={isPushing}
              >
                <SelectTrigger className="h-8.5 text-xs font-mono">
                  <SelectValue placeholder="Pilih model lokal..." />
                </SelectTrigger>
                <SelectContent>
                  {installedModels.map((m) => (
                    <SelectItem key={m.name} value={m.name} className="text-xs font-mono">
                      {m.name.startsWith("er-ai-code")
                        ? `💻 ${m.name} (Koding)`
                        : m.name.startsWith("er-ai-assistant")
                        ? `🤖 ${m.name} (Asisten)`
                        : m.name.startsWith("er-ai-vision")
                        ? `👁️ ${m.name} (Vision)`
                        : m.name.startsWith("er-ai:")
                        ? `✨ ${m.name} (Hasil Latihan)`
                        : m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Username Ollama & Target Repository */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  2. Username Akun Ollama:
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="contoh: robyfull"
                  disabled={isPushing}
                  className="h-8.5 text-xs font-mono font-medium focus-visible:ring-teal-500/40"
                />
                <p className="text-[10px] text-muted-foreground truncate">
                  Akun di <span className="text-teal-400">ollama.com</span>
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Nama Model di Registry:
                </Label>
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="er-ai-code:v1.0"
                  disabled={isPushing}
                  className="h-8.5 text-xs font-mono font-medium focus-visible:ring-teal-500/40"
                />
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  Target: <strong className="text-teal-300">{targetRepo}</strong>
                </p>
              </div>
            </div>

            {/* 3. Kunci Publik SSH (Diperlukan oleh Ollama Hub untuk verifikasi) */}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 sm:p-3 space-y-2">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <KeyRound className="size-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Kunci Publik Ollama {publicKeyInfo.isSystemService ? "(Service)" : ""}</span>
                </div>
                {publicKeyInfo.connectUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openExternalLink(publicKeyInfo.connectUrl!)}
                    className="h-6.5 px-2.5 text-[11px] bg-teal-600 hover:bg-teal-500 text-white gap-1 font-medium shadow-xs shrink-0 self-start xs:self-auto"
                  >
                    <ExternalLink className="size-3" />
                    <span>Tautkan Akun 1-Klik</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenKeysPage}
                    className="h-6.5 px-2 text-[10px] text-teal-400 hover:text-teal-300 gap-1 font-mono shrink-0 self-start xs:self-auto"
                  >
                    <span>ollama.com/settings/keys</span>
                    <ExternalLink className="size-2.5" />
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {publicKeyInfo.isSystemService ? (
                  <>
                    Di Linux, Ollama berjalan sebagai systemd service dengan file <code className="text-teal-300 font-mono text-[10px]">{publicKeyInfo.keyPath}</code>. Klik tombol <strong>Tautkan Akun 1-Klik</strong> (atau salin kunci di bawah ke <strong className="cursor-pointer text-teal-400 underline" onClick={handleOpenKeysPage}>ollama.com/settings/keys</strong>) untuk otorisasi akun.
                  </>
                ) : (
                  <>
                    Sebelum push, pastikan Kunci Publik di bawah telah ditambahkan ke pengaturan akun di <strong className="cursor-pointer text-teal-400 underline" onClick={handleOpenKeysPage}>ollama.com/settings/keys</strong>.
                  </>
                )}
              </p>

              <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 bg-background/80 border border-border rounded-md p-1.5">
                <code className="text-[10px] font-mono text-teal-300 truncate flex-1 select-all px-1 py-0.5">
                  {publicKeyInfo.publicKey || "Kunci belum ditemukan"}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                  disabled={!publicKeyInfo.publicKey}
                  className="h-6.5 px-2 text-[10px] shrink-0 gap-1 self-end xs:self-auto"
                >
                  {copiedKey ? <Check className="size-3 text-teal-400" /> : <Copy className="size-3" />}
                  <span>{copiedKey ? "Tersalin" : "Salin Kunci"}</span>
                </Button>
              </div>
            </div>

            {/* Status Box Saat/Setelah Push */}
            {pushStatus !== "idle" && (
              <div
                className={`rounded-lg border p-2.5 sm:p-3 text-xs space-y-2 ${
                  pushStatus === "running"
                    ? "border-teal-500/40 bg-teal-500/10 text-teal-200"
                    : pushStatus === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-destructive/40 bg-destructive/10 text-destructive-foreground"
                }`}
              >
                <div className="flex items-start gap-2">
                  {pushStatus === "running" && <Loader2 className="size-4 animate-spin text-teal-400 shrink-0 mt-0.5" />}
                  {pushStatus === "success" && <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />}
                  {pushStatus === "error" && <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />}
                  <div className="flex-1 whitespace-pre-wrap font-sans text-xs leading-relaxed break-words">
                    {statusMessage}
                  </div>
                </div>

                {/* Instruksi bila sukses */}
                {pushStatus === "success" && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-1.5">
                    <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                      <Laptop className="size-3.5" />
                      Cara Menjalankan di Device Lain:
                    </span>
                    <div className="flex items-center gap-2 bg-zinc-950 border border-emerald-500/30 rounded p-1.5 font-mono text-xs text-emerald-400">
                      <span className="flex-1 select-all truncate">{`ollama run ${targetRepo}`}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCommand(`ollama run ${targetRepo}`)}
                        className="h-6 px-2 text-[10px] text-emerald-300 hover:text-white shrink-0"
                      >
                        {copiedCommand ? <Check className="size-3" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: EXPORT MODELFILE (OFFLINE) */}
          <TabsContent
            value="export"
            className="flex-1 overflow-y-auto p-3 sm:p-4.5 space-y-3 sm:space-y-3.5 m-0 focus-visible:outline-none"
          >
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-2.5 sm:p-3 space-y-1">
              <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-teal-400" />
                Ekspor Pengetahuan Model Tanpa Internet
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Anda dapat menyimpan seluruh konfigurasi & instruksi proyek ke satu file <strong>Modelfile</strong>. Pindahkan file ini ke laptop lain dengan flashdisk, lalu jalankan satu perintah untuk langsung mengaktifkannya!
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Pilih Model yang Ingin Diekspor:
              </Label>
              <Select
                value={selectedModel}
                onValueChange={(val) => setSelectedModel(val)}
              >
                <SelectTrigger className="h-8.5 text-xs font-mono">
                  <SelectValue placeholder="Pilih model..." />
                </SelectTrigger>
                <SelectContent>
                  {installedModels.map((m) => (
                    <SelectItem key={m.name} value={m.name} className="text-xs font-mono">
                      {m.name.startsWith("er-ai-code")
                        ? `💻 ${m.name} (Koding)`
                        : m.name.startsWith("er-ai-assistant")
                        ? `🤖 ${m.name} (Asisten)`
                        : m.name.startsWith("er-ai-vision")
                        ? `👁️ ${m.name} (Vision)`
                        : m.name.startsWith("er-ai:")
                        ? `✨ ${m.name}`
                        : m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelfile Code View */}
            <div className="space-y-1.5">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-xs">
                <span className="font-semibold text-muted-foreground font-mono truncate">
                  Isi Modelfile ({selectedModel}):
                </span>
                <div className="flex items-center gap-1.5 shrink-0 self-end xs:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyModelfile}
                    disabled={!modelfileContent}
                    className="h-6.5 px-2 text-[10px] gap-1"
                  >
                    {copiedModelfile ? <Check className="size-3 text-teal-400" /> : <Copy className="size-3" />}
                    <span>{copiedModelfile ? "Tersalin" : "Salin Teks"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleSaveModelfile}
                    disabled={!modelfileContent}
                    className="h-6.5 px-2.5 text-[10px] bg-teal-600 hover:bg-teal-500 text-white gap-1"
                  >
                    <Download className="size-3" />
                    <span>Simpan File</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-950 p-2.5 sm:p-3 font-mono text-[11px] text-zinc-300 border border-border min-h-[120px] max-h-[190px] overflow-y-auto whitespace-pre-wrap select-all">
                {isLoadingModelfile ? (
                  <div className="flex items-center justify-center h-28 text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin text-teal-400" />
                    <span>Membaca Modelfile dari Ollama...</span>
                  </div>
                ) : (
                  modelfileContent || "Modelfile kosong atau tidak ditemukan."
                )}
              </div>
            </div>

            {/* Instruksi Penggunaan Modelfile di Device Lain */}
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 sm:p-3 space-y-1.5 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Terminal className="size-3.5 text-teal-400" />
                Langkah di Device / Laptop Baru:
              </span>
              <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
                <li>Kirim file Modelfile yang disimpan tadi ke device baru Anda.</li>
                <li className="break-all">
                  Tarik model dasar: <code className="text-teal-300 font-mono text-[10px]">ollama pull qwen2.5-coder:3b</code>
                </li>
                <li className="break-all">
                  Buat model: <code className="text-teal-300 font-mono text-[10px]">ollama create er-ai-code:v1.0 -f Modelfile</code>
                </li>
                <li>Model ER-AI siap digunakan di terminal, VS Code, maupun WebUI!</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Footer with responsive stacking */}
        <DialogFooter className="p-3 sm:p-3.5 border-t border-border bg-muted/10 shrink-0 flex flex-col-reverse xs:flex-row xs:items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 border-border w-full xs:w-auto"
          >
            Tutup
          </Button>

          <Button
            size="sm"
            onClick={handlePush}
            disabled={isPushing || !selectedModel || !cleanUsername}
            className="h-8 px-3.5 sm:px-4 bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs gap-1.5 shadow-xs w-full xs:w-auto justify-center"
          >
            {isPushing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Sedang Mem-push...</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-3.5" />
                <span className="hidden sm:inline">Push ke Ollama Hub Sekarang</span>
                <span className="inline sm:hidden">Push ke Hub Sekarang</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
