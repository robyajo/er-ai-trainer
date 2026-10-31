# 📊 Ikhtisar Model ER-AI (Models Overview)

Dokumen ini menyajikan perbandingan komprehensif, arsitektur dasar, alokasi memori (VRAM & RAM), serta panduan perangkat keras untuk keluarga model **ER-AI**.

---

## 📋 Matriks Perbandingan Model

| Atribut | 💻 `er-ai-code:v1.0` | 🤖 `er-ai-assistant:v1.0` | 👁️ `er-ai-vision:v1.0` | 🧠 `er-ai-think:v1.0` |
| :--- | :--- | :--- | :--- | :--- |
| **Model Dasar (Base)** | `qwen2.5-coder:3b` | `qwen2.5:1.5b` | `moondream:latest` (v2) | `deepseek-r1:1.5b` |
| **Pengembang Basis** | Alibaba Cloud (Qwen) | Alibaba Cloud (Qwen) | VikhyatK (Moondream) | DeepSeek-AI |
| **Jumlah Parameter** | 3.1 Miliar (3.1B) | 1.5 Miliar (1.5B) | ~1.86 Miliar (~1.86B) | 1.8 Miliar (1.8B) |
| **Format Bobot** | GGUF | GGUF | GGUF | GGUF |
| **Tingkat Kuantisasi** | `Q4_K_M` | `Q4_K_M` | `Q4_0` | `Q4_K_M` |
| **Ukuran File Disk** | **1.9 GB** | **986 MB** | **1.7 GB** | **1.1 GB** |
| **Jendela Konteks (Context)**| 32,768 token (32K) | 16,384 token (16K) | 2,048 token (2K) | 32,768 token (32K) |
| **Arsitektur Backbone** | Transformer Decoder (`qwen2`) | Transformer Decoder (`qwen2`) | SigLIP / CLIP + Phi-2 (`phi2`) | Distill-Qwen (`qwen2`) |
| **Suhu Inferensi (Temp)** | `0.2` (presisi tinggi) | `0.7` (natural conversational) | `0.0` (deterministik) | Default Dynamic R1 |
| **Top-P Sampling** | `0.85` | `0.9` | N/A | N/A |
| **Fitur Khusus UI** | Syntax Highlighting | Voice TTS / STT | Vision Input + Image Studio | Interactive `<think>` Accordion |

---

## 🖥️ Analisis Beban Hardware & Kompatibilitas GPU

### Profil Sistem Target
- **CPU**: Intel Core i5-13420H (12 Threads, up to 4.60 GHz)
- **RAM**: 16 GB DDR4/DDR5
- **GPU**: NVIDIA GeForce RTX 2050 Laptop GPU
- **VRAM Dedikasi**: **4,096 MB (4 GB) GDDR6**
- **Sistem Operasi**: Linux x86_64

### Alokasi Memori VRAM Saat Inferensi
Ollama memuat layer model ke dalam VRAM kartu grafis menggunakan runner `llamacpp` teroptimasi CUDA.

```
Total VRAM Tersedia: 4.00 GB (4096 MB)
-------------------------------------------------------------------------
Model                   Ukuran Bobot   Konteks KV Cache   Total VRAM Terpakai   Sisa VRAM Cadangan
-------------------------------------------------------------------------
er-ai-assistant:v1.0    ~1.0 GB        ~0.4 GB (4K-16K)   ~1.4 GB / 4.0 GB      ~2.6 GB (Aman 🟢)
er-ai-think:v1.0        ~1.1 GB        ~0.5 GB (8K)       ~1.6 GB / 4.0 GB      ~2.4 GB (Aman 🟢)
er-ai-vision:v1.0       ~1.7 GB        ~0.3 GB (2K)       ~2.0 GB / 4.0 GB      ~2.0 GB (Aman 🟢)
er-ai-code:v1.0         ~1.9 GB        ~0.8 GB (8K-16K)   ~2.7 GB / 4.0 GB      ~1.3 GB (Aman 🟢)
-------------------------------------------------------------------------
```

> [!NOTE]
> Seluruh model keluarga ER-AI berjalan **100% di dalam VRAM GPU RTX 2050**, tanpa perlu offload sebagian ke RAM sistem, menghasilkan kecepatan respons instan (hingga 90–120 token per detik).

---

## 🎯 Peruntukan Masing-Masing Model

### 1. `er-ai-code:v1.0` (Spesialis Koding & Arsitektur)
- Digunakan saat Anda meminta pembuatan kode, implementasi antarmuka komponen React/Tailwind, penulisan fungsi TypeScript yang *type-safe*, pembuatan tes Vitest, atau refactoring modular.
- Dioptimalkan dengan suhu rendah (`0.2`) untuk meminimalisasi halusinasi sintaksis.

### 2. `er-ai-assistant:v1.0` (Asisten Percakapan & Produktivitas Harian)
- Digunakan untuk interaksi umum sehari-hari: merangkum dokumen, menulis surat/email, diskusi ide, menyusun rencana kerja, dan tanya jawab dalam Bahasa Indonesia yang santun.
- Sangat ringan (hanya 986 MB) sehingga waktu *Time-to-First-Token* (TTFT) sangat cepat.

### 3. `er-ai-vision:v1.0` (Multimodal Citra Visual)
- Digunakan ketika pesan Anda menyertakan lampiran gambar (`.png`, `.jpg`, `.webp`).
- Mampu mendeteksi objek, membaca teks dalam gambar (OCR), mengidentifikasi elemen tata letak antarmuka aplikasi, dan bekerja sama dengan **AI Image Editor Studio** aplikasi.

### 4. `er-ai-think:v1.0` (Penalaran Mendalam & Analisis Logika)
- Digunakan untuk masalah-masalah berat yang membutuhkan perenungan mendalam: pemecahan bug misterius, pembuktian algoritma matematika, evaluasi desain arsitektur berskala besar, atau dilema teknik yang rumit.
- Menghasilkan tag `<think>...</think>` yang menampilkan alur penalaran bertahap sebelum memberikan simpulan akhir.
