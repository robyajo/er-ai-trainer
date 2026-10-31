# 📚 Dokumentasi Model ER-AI (ER-AI Trainer)

Selamat datang di pusat dokumentasi resmi ekosistem model kecerdasan buatan **ER-AI**. Repositori ini merangkum seluruh spesifikasi teknis, arsitektur dasar (*base model*), konfigurasi inferensi, panduan hardware, serta modul antarmuka pengguna di aplikasi **ER-AI Trainer**.

---

## 📑 Daftar Isi Dokumentasi

| Dokumen | Deskripsi |
| :--- | :--- |
| 📖 [**Ikhtisar Model (MODELS_OVERVIEW.md)**](./models-overview.md) | Matriks perbandingan 4 pilar model ER-AI, arsitektur dasar, ukuran VRAM, dan panduan hardware GPU. |
| 💻 [**ER-AI Code (`er-ai-code`)**](./er-ai-code.md) | Spesialis rekayasa perangkat lunak, TypeScript clean code, refactoring, dan syntax highlighting. |
| 🤖 [**ER-AI Assistant (`er-ai-assistant`)**](./er-ai-assistant.md) | Asisten percakapan cerdas harian berbahasa Indonesia, riset cepat, dan integrasi suara (STT/TTS). |
| 👁️ [**ER-AI Vision (`er-ai-vision`)**](./er-ai-vision.md) | Pemrosesan citra visual multimodal, deskripsi gambar, OCR, dan integrasi AI Image Editor Studio. |
| 🧠 [**ER-AI Think (`er-ai-think`)**](./er-ai-think.md) | Penalaran mendalam (*Chain-of-Thought* / `<think>`), arsitektur sistem, algoritma, dan investigasi *root-cause*. |
| 🇮🇩 [**Pelatihan Chatbot Indonesia (`training-indonesian-assistant.md`)**](./training-indonesian-assistant.md) | Kurikulum 7 modul bahasa Indonesia, dataset instruksi Q&A, dan pipeline pelatihan chatbot tanya jawab. |
| 🛠️ [**Resep Modelfile (`modelfiles.md`)**](./modelfiles.md) | Kode sumber Modelfile lengkap dan perintah CLI Ollama untuk mereproduksi atau memodifikasi setiap model. |
| 🎨 [**Fitur Studio Multi-Modal (`multimodal-chat-studio.md`)**](./multimodal-chat-studio.md) | Panduan fitur interaksi: Thinking Box, Shiki Syntax Highlighting, Voice STT/TTS, dan Background Changer. |

---

## 🏛️ Filosofi Ekosistem 4 Pilar ER-AI

Ekosistem ER-AI dirancang dengan pendekatan **Multi-Agent / Specialized Model Matrix**. Alih-alih memaksakan satu model monolitik berukuran raksasa yang boros sumber daya, ER-AI membagi kecerdasan buatan menjadi 4 pilar spesifik berukuran ramping (986 MB – 1.9 GB) yang dapat dijalankan secara lokal di kartu grafis konsumen (4 GB VRAM) dengan latensi rendah:

```
                      ┌────────────────────────┐
                      │    ER-AI ECOSYSTEM     │
                      └───────────┬────────────┘
                                  │
         ┌────────────────┬───────┴────────┬────────────────┐
         │                │                │                │
         ▼                ▼                ▼                ▼
   💻 er-ai-code   🤖 er-ai-assistant 👁️ er-ai-vision  🧠 er-ai-think
   (Kodingan)      (Asisten Harian) (Visual & OCR)  (Penalaran Rumit)
   Base: Qwen-Coder  Base: Qwen-2.5   Base: Moondream  Base: DeepSeek-R1
   3.1B / 1.9 GB    1.5B / 986 MB    1.86B / 1.7 GB   1.8B / 1.1 GB
```

---

## ⚡ Panduan Cepat Menjalankan Model

Semua model terintegrasi dengan Ollama lokal (`http://localhost:11434`):

```bash
# Menjalankan model via terminal Ollama
ollama run er-ai-code:v1.0
ollama run er-ai-assistant:v1.0
ollama run er-ai-vision:v1.0
ollama run er-ai-think:v1.0

# Memeriksa status model terpasang
ollama list
```
Di dalam aplikasi **ER-AI Trainer**, cukup buka tab **AI Chat** dan pilih model yang diinginkan dari menu dropdown bersimbol ikon masing-masing.
