# 🎨 Panduan Fitur Studio Multi-Modal (AI Chat)

Dokumen ini menjelaskan integrasi fitur antarmuka pengguna di tab **AI Chat** aplikasi **ER-AI Trainer**, yang mencakup proses penalaran (*thinking*), penyorotan sintaks (*syntax highlighting*), interaksi audio, serta studio pengedit gambar.

---

## 1. 🧠 Akordion Proses Berpikir (Thinking Box)

Model seperti `er-ai-think:v1.0` menghasilkan tag `<think>...</think>` dalam responsnya.

### Implementasi Teknis:
- **Komponen**: [`ChatMessageContent`](../src/components/chat-message-content.tsx)
- **Mekanisme**:
  - Regex `/^<think>([\s\S]*?)<\/think>/i` memisahkan proses berpikir internal dari teks jawaban akhir.
  - Komponen membungkus teks berpikir ke dalam akordion kolapsibel.
  - Header akordion dilengkapi ikon otak 🧠 dengan efek animasi pulse lembut dan lencana jumlah karakter berpikir.
  - Bagian jawaban akhir ditampilkan bersih di bawah akordion tanpa tercampur monolog internal model.

---

## 2. 💻 Penyorotan Sintaks Kode (Syntax Highlighting)

Saat berinteraksi dengan `er-ai-code:v1.0` atau model lainnya ketika membahas kode pemrograman:

### Implementasi Teknis:
- **Engine**: Shiki Highlighter (`tokyo-night` dark theme)
- **Fitur Antarmuka**:
  - Deteksi otomatis blok kode Markdown (triple backticks ` ```lang `).
  - Header blok kode menampilkan nama bahasa pemrograman dan ikon kode.
  - Tombol **Salin Kode** terintegrasi dengan clipboard sistem dan memunculkan label `Tersalin!` selama 2 detik sebagai umpan balik visual.
  - Menyediakan fallback rendering yang anggun jika Shiki sedang melakukan inisialisasi tema.

---

## 3. 🎙️ Interaksi Suara (STT & TTS)

Aplikasi mendukung interaksi audio dua arah tanpa memerlukan API pihak ketiga yang berbayar:

### A. Speech-to-Text (STT) - Dikte Suara Pengguna
- Memanfaatkan **Web Speech API** bawaan browser / Electron (`webkitSpeechRecognition`).
- Dikonfigurasi dengan locale Bahasa Indonesia (`id-ID`).
- Tombol mikrofon di sebelah input chat akan berkedip merah saat mendengarkan dan otomatis menempelkan teks hasil transkripsi ke input pesan.

### B. Text-to-Speech (TTS) - Pembacaan Jawaban Asisten
- Memanfaatkan `speechSynthesis` dengan voice selector bahasa Indonesia.
- Tombol speaker `Dengarkan` / `Hentikan` tersedia pada setiap bubble pesan asisten.
- **Sanitizer Cerdas**: Sebelum dibacakan, teks otomatis dibersihkan dari tag `<think>...</think>`, blok kode Markdown, dan karakter formatting agar tidak terdengar aneh saat diucapkan.

---

## 4. 🪄 Studio Pengedit & Pembuat Latar Belakang Gambar (AI Image Studio)

Model vision (`er-ai-vision:v1.0`) bertugas memahami dan membaca gambar (Image-to-Text), bukan memanipulasi piksel gambar secara langsung. Untuk memenuhi kebutuhan mengubah latar belakang gambar menjadi hitam pekat studio atau transparan:

### Implementasi Teknis:
- **Komponen**: [`ImageEditorDialog`](../src/components/image-editor-dialog.tsx)
- **Akses Langsung**:
  - Tombol **`🪄 Ubah Latar`** di atas bubble gambar riwayat chat.
  - Tombol **`🪄 Buka di Studio & Ubah Latar Belakang Hitam`** di bagian bawah modal pratinjau gambar (Lightbox).
  - Tombol tongkat sihir pada bilah alat lampiran chat.

### Fitur Studio:
1. **Pemisahan Latar Otomatis**:
   - Algoritma pemindai warna latar (*chroma/color-distance clustering*) mendeteksi latar asli dari 4 sudut gambar.
2. **Pilihan Warna Studio**:
   - ⬛ **Black Studio (`#000000`)**: Latar belakang hitam pekat studio foto.
   - 🌌 **Midnight Navy (`#090d16`)**: Nuansa gelap modern khas ER-AI.
   - ⚪ **Putih Bersih (`#ffffff`)**: Latar pas foto formal.
   - 🪟 **Transparan (PNG)**: Menghapus latar menjadi tembus pandang.
   - 🎨 **Palet Hex Kustom & Eyedropper**: Memilih warna sembarang dengan pipet warna.
3. **Pengaturan Lanjutan**:
   - Slider **Toleransi Warna** untuk mengatur kehalusan tepi subjek.
   - Slider **Kecerahan (Brightness)**, **Kontras (Contrast)**, dan **Saturasi (Saturation)**.
4. **Tindakan Cepat**:
   - 📥 **Unduh PNG**: Menyimpan file hasil edit ke disk komputer.
   - 💬 **Pasang ke Input Chat**: Mengirimkan gambar yang telah diedit kembali ke input percakapan untuk dianalisis lebih lanjut oleh `er-ai-vision`.
