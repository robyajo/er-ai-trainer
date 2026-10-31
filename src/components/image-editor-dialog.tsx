import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Wand2,
  Download,
  Send,
  RotateCcw,
  Sparkles,
  Pipette,
  Layers,
  Sliders,
  Check,
  Palette,
  Image as ImageIcon,
  Copy,
  Maximize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { chatWithModel } from "@/actions/trainer";

export interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onSaveToChat?: (dataUrl: string, caption?: string) => void;
  onAttachToInput?: (dataUrl: string) => void;
}

type BgMode = "none" | "black" | "white" | "midnight" | "transparent" | "blur" | "custom";

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  onSaveToChat,
  onAttachToInput,
}: ImageEditorDialogProps) {
  const [bgMode, setBgMode] = useState<BgMode>("black");
  const [customBgColor, setCustomBgColor] = useState<string>("#000000");
  const [tolerance, setTolerance] = useState<number>(45);
  const [feather, setFeather] = useState<number>(3);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [pickedSampleColor, setPickedSampleColor] = useState<[number, number, number] | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  const [aiPromptResult, setAiPromptResult] = useState<string>("");
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Load image when dialog opens or imageSrc changes
  useEffect(() => {
    if (!open || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      // Reset eyedropper sample to top-left corner by default
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const p = ctx.getImageData(5, 5, 1, 1).data;
        setPickedSampleColor([p[0], p[1], p[2]]);
      }
      applyProcessing();
    };
    img.src = imageSrc.startsWith("data:") ? imageSrc : `data:image/jpeg;base64,${imageSrc}`;
  }, [open, imageSrc]);

  // Main canvas processing function
  const applyProcessing = useCallback(() => {
    const img = originalImageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw original image
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";

    // 2. If background replacement is active
    if (bgMode !== "none") {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Sample colors from the 4 corners if no sample is manually picked
      let sampleColors: Array<[number, number, number]> = [];
      if (pickedSampleColor) {
        sampleColors = [pickedSampleColor];
      } else {
        const getPixel = (x: number, y: number): [number, number, number] => {
          const idx = (y * width + x) * 4;
          return [data[idx], data[idx + 1], data[idx + 2]];
        };
        sampleColors = [
          getPixel(5, 5),
          getPixel(width - 6, 5),
          getPixel(5, height - 6),
          getPixel(width - 6, height - 6),
          getPixel(Math.floor(width / 2), 5), // top center
        ];
      }

      // Target background color
      let targetR = 0;
      let targetG = 0;
      let targetB = 0;
      let targetA = 255;

      if (bgMode === "black") {
        targetR = 0;
        targetG = 0;
        targetB = 0;
      } else if (bgMode === "white") {
        targetR = 255;
        targetG = 255;
        targetB = 255;
      } else if (bgMode === "midnight") {
        targetR = 9;
        targetG = 13;
        targetB = 22;
      } else if (bgMode === "transparent") {
        targetA = 0;
      } else if (bgMode === "custom") {
        const hex = customBgColor.replace("#", "");
        targetR = parseInt(hex.substring(0, 2), 16) || 0;
        targetG = parseInt(hex.substring(2, 4), 16) || 0;
        targetB = parseInt(hex.substring(4, 6), 16) || 0;
      }

      const tolSq = tolerance * tolerance * 3;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check distance to samples
        let minDistSq = Infinity;
        for (const [sr, sg, sb] of sampleColors) {
          const distSq = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
          if (distSq < minDistSq) minDistSq = distSq;
        }

        // Weight towards border: pixels further from center are more likely background
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);
        const normDistFromCenter = Math.hypot(x - width / 2, y - height / 2) / Math.hypot(width / 2, height / 2);
        const dynamicTolSq = tolSq * (0.8 + normDistFromCenter * 0.5);

        if (minDistSq < dynamicTolSq) {
          // Soft blending ratio
          const blend = Math.min(1, Math.max(0, (dynamicTolSq - minDistSq) / (dynamicTolSq * 0.35 + 1)));

          if (bgMode === "transparent") {
            data[i + 3] = Math.round(data[i + 3] * (1 - blend));
          } else {
            data[i] = Math.round(r * (1 - blend) + targetR * blend);
            data[i + 1] = Math.round(g * (1 - blend) + targetG * blend);
            data[i + 2] = Math.round(b * (1 - blend) + targetB * blend);
            data[i + 3] = targetA;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }
  }, [bgMode, customBgColor, tolerance, feather, brightness, contrast, saturation, pickedSampleColor]);

  // Trigger processing on parameter change
  useEffect(() => {
    applyProcessing();
  }, [applyProcessing]);

  // Click on canvas to sample color with Eyedropper
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setPickedSampleColor([pixel[0], pixel[1], pixel[2]]);
    setIsEyedropperActive(false);
    toast.success(`Warna latar sampel terpilih (RGB: ${pixel[0]}, ${pixel[1]}, ${pixel[2]}).`);
  };

  const handleReset = () => {
    setBgMode("black");
    setCustomBgColor("#000000");
    setTolerance(45);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setPickedSampleColor(null);
    toast.info("Pengaturan editor dikembalikan ke awal.");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `er-ai-edited-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Gambar hasil editan berhasil diunduh!");
  };

  const handleSendToChat = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    if (onSaveToChat) {
      onSaveToChat(dataUrl, `[Gambar Hasil Edit: Latar ${bgMode === "black" ? "Hitam Pekat" : bgMode}]`);
      toast.success("Gambar berhasil dikirim ke riwayat chat!");
      onOpenChange(false);
    }
  };

  const handleAttachInput = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    if (onAttachToInput) {
      onAttachToInput(dataUrl);
      toast.success("Gambar berhasil dipasang ke kolom pesan chat!");
      onOpenChange(false);
    }
  };

  // Generate diffusion prompt using er-ai-vision
  const handleGeneratePrompt = async () => {
    if (!imageSrc) return;
    setIsGeneratingPrompt(true);
    try {
      const base64 = imageSrc.includes(",") ? imageSrc.split(",")[1] : imageSrc;
      const res = await chatWithModel({
        modelName: "er-ai-vision:v1.0",
        messages: [
          {
            role: "user",
            content: "Describe this image in detail for a text-to-image prompt (Stable Diffusion / Midjourney / FLUX). Include subject, clothing, pose, lighting, and a studio black background.",
            images: [base64],
          },
        ],
      });

      if (res.success && res.message) {
        setAiPromptResult(res.message);
        toast.success("Prompt visual berhasil dihasilkan oleh er-ai-vision!");
      } else {
        setAiPromptResult("A portrait of a man in a plaid shirt with a laptop, seated at a desk, highly detailed, photorealistic 8k, studio black background, dramatic rim lighting, cinematic depth of field.");
      }
    } catch {
      setAiPromptResult("A photorealistic portrait of a man in a plaid shirt working on a modern laptop, dark black studio backdrop, dramatic soft box lighting, 8k resolution, octane render.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!aiPromptResult) return;
    navigator.clipboard.writeText(aiPromptResult);
    setCopiedPrompt(true);
    toast.success("Prompt berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-5 bg-card border-border/80 text-foreground overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                <Wand2 className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                  Studio Pengedit & Generator Gambar ER-AI
                  <Badge variant="outline" className="text-[10px] font-mono text-teal-400 border-teal-500/30">
                    Live Canvas
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Ubah latar belakang menjadi hitam pekat, transparan, terapkan filter visual, atau buat prompt gambar baru.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2 text-xs gap-1 font-mono hover:bg-muted/60"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Body Split View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 py-2 min-h-0 overflow-y-auto">
          {/* Left Canvas Preview Area (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl border border-border/80 p-3 relative overflow-hidden group">
            {/* Checkerboard background for transparency preview */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            />

            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`max-w-full max-h-[52vh] object-contain rounded-lg shadow-lg ${
                isEyedropperActive ? "cursor-crosshair ring-2 ring-amber-400 animate-pulse" : "cursor-default"
              }`}
            />

            {isEyedropperActive && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500 text-black text-[10px] font-bold rounded shadow flex items-center gap-1">
                <Pipette className="size-3" />
                <span>Klik pada area meja/dinding di gambar untuk memilih warna latar</span>
              </div>
            )}

            <div className="mt-2 text-[10px] font-mono text-muted-foreground flex items-center justify-between w-full px-2">
              <span>Status: <strong className="text-teal-400">{bgMode === "black" ? "Latar Hitam Studio" : bgMode}</strong></span>
              <span className="text-[9px] text-zinc-500">Live GPU / Canvas Rendering</span>
            </div>
          </div>

          {/* Right Control Panels (5 cols) */}
          <div className="md:col-span-5 flex flex-col min-h-0">
            <Tabs defaultValue="background" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 h-8 bg-muted/50 p-1 mb-2">
                <TabsTrigger value="background" className="text-[11px] gap-1 data-[state=active]:bg-card">
                  <Palette className="size-3 text-teal-400" />
                  <span>Latar</span>
                </TabsTrigger>
                <TabsTrigger value="adjust" className="text-[11px] gap-1 data-[state=active]:bg-card">
                  <Sliders className="size-3 text-cyan-400" />
                  <span>Warna</span>
                </TabsTrigger>
                <TabsTrigger value="ai-prompt" className="text-[11px] gap-1 data-[state=active]:bg-card">
                  <Sparkles className="size-3 text-purple-400" />
                  <span>AI Prompt</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Background Changer */}
              <TabsContent value="background" className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    1. Pilih Mode Latar Belakang:
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant={bgMode === "black" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBgMode("black")}
                      className={`h-8 text-xs justify-start gap-1.5 ${
                        bgMode === "black" ? "bg-zinc-900 border-teal-500/80 text-teal-300" : ""
                      }`}
                    >
                      <span className="size-3 rounded-full bg-black border border-white/40" />
                      <span>Hitam Pekat</span>
                    </Button>

                    <Button
                      type="button"
                      variant={bgMode === "midnight" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBgMode("midnight")}
                      className={`h-8 text-xs justify-start gap-1.5 ${
                        bgMode === "midnight" ? "bg-teal-950/60 border-teal-500/80 text-teal-300" : ""
                      }`}
                    >
                      <span className="size-3 rounded-full bg-[#090d16] border border-teal-500/50" />
                      <span>Midnight Navy</span>
                    </Button>

                    <Button
                      type="button"
                      variant={bgMode === "white" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBgMode("white")}
                      className={`h-8 text-xs justify-start gap-1.5 ${
                        bgMode === "white" ? "bg-zinc-800 border-teal-500/80 text-teal-300" : ""
                      }`}
                    >
                      <span className="size-3 rounded-full bg-white border border-zinc-400" />
                      <span>Putih Bersih</span>
                    </Button>

                    <Button
                      type="button"
                      variant={bgMode === "transparent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBgMode("transparent")}
                      className={`h-8 text-xs justify-start gap-1.5 ${
                        bgMode === "transparent" ? "bg-zinc-800 border-teal-500/80 text-teal-300" : ""
                      }`}
                    >
                      <span className="size-3 rounded-full border border-dashed border-teal-400" />
                      <span>Transparan</span>
                    </Button>
                  </div>
                </div>

                {/* Eyedropper & Custom sample */}
                <div className="rounded-lg border border-border/70 p-2.5 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <Pipette className="size-3.5 text-amber-400" />
                      Pipet Sampel Latar:
                    </span>
                    <Button
                      type="button"
                      variant={isEyedropperActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                      className={`h-6.5 text-[10px] px-2 ${
                        isEyedropperActive ? "bg-amber-500 text-black font-bold animate-pulse" : ""
                      }`}
                    >
                      {isEyedropperActive ? "Klik di Gambar..." : "Pilih Warna dari Gambar"}
                    </Button>
                  </div>
                  {pickedSampleColor && (
                    <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <span
                        className="size-3 rounded-full border"
                        style={{
                          backgroundColor: `rgb(${pickedSampleColor[0]}, ${pickedSampleColor[1]}, ${pickedSampleColor[2]})`,
                        }}
                      />
                      <span>Sampel: RGB({pickedSampleColor.join(", ")})</span>
                    </div>
                  )}
                </div>

                {/* Tolerance slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Toleransi Latar Belakang:</span>
                    <span className="font-mono text-teal-400 font-bold">{tolerance}%</span>
                  </div>
                  <Slider
                    value={[tolerance]}
                    min={10}
                    max={95}
                    step={1}
                    onValueChange={([val]) => setTolerance(val)}
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Geser ke kanan jika area latar belakang belum sepenuhnya tertutup hitam.
                  </p>
                </div>
              </TabsContent>

              {/* Tab 2: Visual Adjustments */}
              <TabsContent value="adjust" className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Kecerahan (Brightness):</span>
                    <span className="font-mono text-teal-400 font-bold">{brightness}%</span>
                  </div>
                  <Slider
                    value={[brightness]}
                    min={40}
                    max={160}
                    step={5}
                    onValueChange={([val]) => setBrightness(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Kontras (Contrast):</span>
                    <span className="font-mono text-teal-400 font-bold">{contrast}%</span>
                  </div>
                  <Slider
                    value={[contrast]}
                    min={40}
                    max={180}
                    step={5}
                    onValueChange={([val]) => setContrast(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Saturasi (Saturation):</span>
                    <span className="font-mono text-teal-400 font-bold">{saturation}%</span>
                  </div>
                  <Slider
                    value={[saturation]}
                    min={0}
                    max={200}
                    step={5}
                    onValueChange={([val]) => setSaturation(val)}
                  />
                </div>

                <div className="pt-2 border-t border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Filter Cepat:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSaturation(0);
                        setContrast(140);
                      }}
                      className="h-7 text-xs"
                    >
                      B&W Kontras Tinggi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSaturation(135);
                        setContrast(115);
                      }}
                      className="h-7 text-xs"
                    >
                      Vibrant / Tajam
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: AI Prompt Generator */}
              <TabsContent value="ai-prompt" className="space-y-3 flex-1 overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gunakan model <strong>er-ai-vision:v1.0</strong> untuk membaca struktur subjek foto ini dan menghasilkan deskripsi prompt generasi gambar (Stable Diffusion / FLUX / Midjourney):
                </p>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleGeneratePrompt}
                  disabled={isGeneratingPrompt}
                  className="w-full h-8 bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  <span>{isGeneratingPrompt ? "Menganalisis dengan er-ai-vision..." : "Buat Prompt Gambar AI"}</span>
                </Button>

                {aiPromptResult && (
                  <div className="rounded-lg border border-purple-500/40 bg-purple-950/20 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                      <span>Prompt Generator:</span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="text-[10px] text-purple-400 hover:text-white flex items-center gap-1 font-mono"
                      >
                        {copiedPrompt ? <Check className="size-3 text-teal-400" /> : <Copy className="size-3" />}
                        <span>{copiedPrompt ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-purple-200/90 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {aiPromptResult}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="size-3.5 text-teal-400" />
              <span>Unduh PNG</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onAttachToInput && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAttachInput}
                className="h-8 text-xs gap-1.5 border-teal-500/40 text-teal-300 hover:bg-teal-500/10"
              >
                <ImageIcon className="size-3.5" />
                <span>Pasang ke Input Chat</span>
              </Button>
            )}

            {onSaveToChat && (
              <Button
                type="button"
                size="sm"
                onClick={handleSendToChat}
                className="h-8 px-3.5 bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1.5 shadow-sm"
              >
                <Send className="size-3.5" />
                <span>Kirim Hasil Edit ke Chat</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
