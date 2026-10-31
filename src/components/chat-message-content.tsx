import React, { useState, useEffect, useMemo } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Code2,
  Terminal,
  Volume2,
  VolumeX,
  Maximize2,
  Wand2,
} from "lucide-react";
import { ImageEditorDialog } from "./image-editor-dialog";
import { codeToHtml } from "shiki";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Cache shiki highlighted outputs to avoid re-highlighting identical code blocks
const highlightCache = new Map<string, string>();

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string>("");

  const cleanLang = (language || "text").trim().toLowerCase();
  const cacheKey = `${cleanLang}:${code}`;

  useEffect(() => {
    let isMounted = true;

    if (highlightCache.has(cacheKey)) {
      setHtml(highlightCache.get(cacheKey)!);
      return;
    }

    async function highlight() {
      try {
        const result = await codeToHtml(code, {
          lang: cleanLang,
          theme: "tokyo-night",
        });
        if (isMounted) {
          highlightCache.set(cacheKey, result);
          setHtml(result);
        }
      } catch {
        // Fallback to text if language not found
        try {
          const fallback = await codeToHtml(code, {
            lang: "text",
            theme: "tokyo-night",
          });
          if (isMounted) {
            highlightCache.set(cacheKey, fallback);
            setHtml(fallback);
          }
        } catch {
          if (isMounted) setHtml("");
        }
      }
    }

    highlight();
    return () => {
      isMounted = false;
    };
  }, [cacheKey, code, cleanLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Kode berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  return (
    <div className="my-2.5 rounded-lg border border-border/80 bg-zinc-950/90 overflow-hidden shadow-xs font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-border/60 text-muted-foreground select-none">
        <div className="flex items-center gap-1.5">
          {cleanLang === "bash" || cleanLang === "sh" || cleanLang === "shell" ? (
            <Terminal className="size-3.5 text-emerald-400" />
          ) : (
            <Code2 className="size-3.5 text-teal-400" />
          )}
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-300">
            {cleanLang || "CODE"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="size-3 text-teal-400" />
              <span className="text-teal-400 font-sans">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="font-sans">Salin</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3 overflow-x-auto text-[11.5px] leading-relaxed [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="text-zinc-200 whitespace-pre font-mono">{code}</pre>
        )}
      </div>
    </div>
  );
}

// Formats prose lines with markdown elements (bold, italic, inline code, headings, lists)
export function FormattedProse({ content }: { content: string }) {
  const lines = content.split("\n");

  const formatInline = (text: string): React.ReactNode => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1 py-0.5 mx-0.5 rounded bg-muted/80 text-teal-300 font-mono text-[11px] border border-border/50"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={idx} className="italic text-foreground/90">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 leading-relaxed font-sans text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="text-xs font-bold text-foreground pt-1.5 pb-0.5 border-b border-border/30"
            >
              {formatInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="text-sm font-bold text-teal-300 pt-2 pb-0.5 border-b border-border/40"
            >
              {formatInline(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="text-sm font-extrabold text-teal-200 pt-2 pb-1"
            >
              {formatInline(trimmed.slice(2))}
            </h2>
          );
        }

        // Unordered lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5">
              <span className="text-teal-400 mt-1 select-none text-[10px]">●</span>
              <span className="flex-1">{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5">
              <span className="text-teal-400 font-mono text-[10px] select-none shrink-0 mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <div
              key={idx}
              className="border-l-2 border-teal-500/50 pl-2.5 py-0.5 my-1 text-muted-foreground italic bg-muted/20 rounded-r"
            >
              {formatInline(trimmed.slice(2))}
            </div>
          );
        }

        return <p key={idx}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

// Parses raw markdown into alternate blocks of prose and code blocks
export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const result: Array<{ type: "prose" | "code"; content: string; lang?: string }> = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const prose = content.substring(lastIndex, match.index);
        if (prose.trim()) {
          result.push({ type: "prose", content: prose });
        }
      }

      result.push({
        type: "code",
        lang: match[1] || "text",
        content: match[2].replace(/\n$/, ""),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      if (remaining.trim()) {
        result.push({ type: "prose", content: remaining });
      }
    }

    if (result.length === 0 && content) {
      result.push({ type: "prose", content });
    }

    return result;
  }, [content]);

  return (
    <div className="space-y-1">
      {blocks.map((block, idx) =>
        block.type === "code" ? (
          <CodeBlock
            key={idx}
            code={block.content}
            language={block.lang || "text"}
          />
        ) : (
          <FormattedProse key={idx} content={block.content} />
        )
      )}
    </div>
  );
}

interface ChatMessageContentProps {
  content: string;
  role: "user" | "assistant" | "system";
  images?: string[];
  isStreaming?: boolean;
  onSaveEditedImage?: (dataUrl: string, caption?: string) => void;
}

export function ChatMessageContent({
  content,
  role,
  images,
  isStreaming,
  onSaveEditedImage,
}: ChatMessageContentProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);

  // Extract <think>...</think> if present (DeepSeek-R1, LFM3, Qwen-Thinking, etc.)
  const { thought, answer, isCurrentlyThinking } = useMemo(() => {
    if (role !== "assistant") {
      return { thought: null, answer: content, isCurrentlyThinking: false };
    }

    const closedMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    if (closedMatch) {
      const thoughtText = closedMatch[1].trim();
      const answerText = content.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
      return { thought: thoughtText, answer: answerText, isCurrentlyThinking: false };
    }

    const openMatch = content.match(/<think>([\s\S]*)$/i);
    if (openMatch) {
      const thoughtText = openMatch[1].trim();
      return { thought: thoughtText, answer: "", isCurrentlyThinking: true };
    }

    return { thought: null, answer: content, isCurrentlyThinking: false };
  }, [content, role]);

  // Voice playback cleaner and player
  const handleToggleVoice = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Browser / sistem ini tidak mendukung Text-to-Speech.");
      return;
    }

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }

    // Clean text: strip code blocks, thinking tags, and markdown symbols
    const cleanSpeech = answer
      .replace(/```[\s\S]*?```/g, "Kode program dilewati.")
      .replace(/`[^`]+`/g, "")
      .replace(/[#*_~>]/g, "")
      .trim();

    if (!cleanSpeech) {
      toast.info("Tidak ada teks percakapan yang dapat dibacakan.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes("id") || v.lang.includes("ID"));
    if (idVoice) utterance.voice = idVoice;
    utterance.lang = idVoice ? idVoice.lang : "id-ID";
    utterance.rate = 1.05;

    utterance.onend = () => setIsPlayingVoice(false);
    utterance.onerror = () => setIsPlayingVoice(false);

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (isPlayingVoice && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlayingVoice]);

  return (
    <div className="space-y-2">
      {/* Attached Images Grid (Vision) */}
      {images && images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((imgSrc, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden border border-border/70 max-w-[220px] max-h-[160px] bg-zinc-950/40 shadow-xs"
            >
              <img
                src={imgSrc.startsWith("data:") ? imgSrc : `data:image/jpeg;base64,${imgSrc}`}
                alt={`Lampiran ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-102"
                onClick={() => setPreviewImage(imgSrc)}
              />

              {/* Action buttons always accessible */}
              <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingImage(imgSrc);
                  }}
                  className="px-2 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-sans font-semibold flex items-center gap-1 shadow-md transition-all hover:scale-105"
                  title="Ubah Latar Belakang Menjadi Hitam"
                >
                  <Wand2 className="size-3" />
                  <span>Edit Latar</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(imgSrc);
                  }}
                  className="p-1 rounded-md bg-black/70 hover:bg-black/90 text-white border border-white/20 shadow-md"
                  title="Perbesar gambar"
                >
                  <Maximize2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thinking Accordion (DeepSeek-R1 / LFM3 Thinking Mode) */}
      {thought && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-950/15 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsThinkingOpen(!isThinkingOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-purple-300 hover:bg-purple-900/20 transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <Brain
                className={`size-3.5 text-purple-400 ${
                  isCurrentlyThinking ? "animate-pulse" : ""
                }`}
              />
              <span className="font-semibold text-[11px]">
                {isCurrentlyThinking
                  ? "Sedang Berpikir Secara Mendalam (Thinking)..."
                  : "Proses Berpikir (Thinking)"}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 font-mono border-purple-500/30 text-purple-300 bg-purple-500/10"
              >
                {thought.length} karakter
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-purple-400">
              <span className="text-[10px] font-sans">
                {isThinkingOpen ? "Sembunyikan" : "Tampilkan"}
              </span>
              {isThinkingOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </div>
          </button>

          {isThinkingOpen && (
            <div className="p-3 border-t border-purple-500/20 text-[11px] text-purple-200/80 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-purple-950/30">
              {thought}
            </div>
          )}
        </div>
      )}

      {/* Main Message Content */}
      {role === "user" ? (
        <div className="whitespace-pre-wrap break-words">{content}</div>
      ) : (
        <div className="text-foreground">
          {answer ? (
            <MarkdownRenderer content={answer} />
          ) : isCurrentlyThinking ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono italic">
              <span className="size-2 rounded-full bg-purple-400 animate-ping" />
              <span>Menyiapkan hasil penalaran...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          )}

          {/* Voice Output (TTS) Action Button for Assistant */}
          {answer && (
            <div className="mt-2 pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans transition-colors ${
                  isPlayingVoice
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title={isPlayingVoice ? "Hentikan Suara" : "Dengarkan Suara (TTS)"}
              >
                {isPlayingVoice ? (
                  <>
                    <VolumeX className="size-3" />
                    <span>Hentikan Suara</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="size-3 text-teal-400" />
                    <span>Dengarkan</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-xl overflow-hidden border border-border shadow-2xl bg-zinc-950">
            <img
              src={previewImage.startsWith("data:") ? previewImage : `data:image/jpeg;base64,${previewImage}`}
              alt="Pratinjau Gambar Penuh"
              className="max-w-full max-h-[80vh] object-contain"
            />
            <div className="p-3 flex items-center justify-between text-xs text-muted-foreground font-mono bg-zinc-900 border-t border-border/60">
              <span>Klik di luar gambar untuk menutup</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetImg = previewImage;
                  setPreviewImage(null);
                  setEditingImage(targetImg);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-sans font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
              >
                <Wand2 className="size-4" />
                <span>Buka di Studio & Ubah Latar Belakang Hitam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Image Editor & Background Changer */}
      {editingImage && (
        <ImageEditorDialog
          open={!!editingImage}
          onOpenChange={(op) => !op && setEditingImage(null)}
          imageSrc={editingImage}
          onSaveToChat={(dataUrl, caption) => {
            if (onSaveEditedImage) {
              onSaveEditedImage(dataUrl, caption);
            }
          }}
        />
      )}
    </div>
  );
}
