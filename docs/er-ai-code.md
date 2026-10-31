# 💻 Model `er-ai-code:v1.0`

`er-ai-code:v1.0` adalah model kecerdasan buatan utama yang dikhususkan untuk seluruh kebutuhan rekayasa perangkat lunak, pemrograman komputer, refactoring arsitektur, dan penulisan tes otomatis.

---

## 📌 Informasi Teknis Singkat

- **Nama Model**: `er-ai-code:v1.0`
- **Model Dasar (*Base Model*)**: `qwen2.5-coder:3b`
- **Pengembang Basis**: Alibaba Cloud Qwen Team
- **Ukuran File**: 1.9 GB
- **Format**: GGUF (`Q4_K_M`)
- **Jumlah Parameter**: 3.1 Miliar (3.1B)
- **Panjang Konteks**: 32,768 token (32K)
- **Parameter Inferensi**:
  - `temperature`: `0.2` (mencegah kesalahan sintaksis)
  - `top_p`: `0.85`
  - `num_ctx`: `32768`

---

## 🎯 Karakteristik & Aturan Perilaku (System Prompt)

Model ini diinstruksikan dengan aturan ketat untuk developer profesional:

1. **Strict Clean Code & Type-Safety**:
   - Selalu menghasilkan kode TypeScript yang ketat tanpa manipulasi tipe `any`.
   - Mengikuti prinsip SOLID, *Separation of Concerns*, dan arsitektur modular yang rapi.
2. **Kode Lengkap & Siap Jalankan**:
   - Menghindari kode placeholder seperti `// TODO: implement later` atau `... sisa kode sama ...`.
   - Menghasilkan blok kode utuh yang siap disalin dan dijalankan langsung di lingkungan proyek.
3. **Pertahankan Stabilitas**:
   - Saat merefaktor atau menambah fitur baru, model menjaga kompatibilitas dengan fungsi-fungsi yang telah berjalan sebelumnya.
4. **Bahasa Indonesia Profesional**:
   - Menggunakan bahasa pengantar yang santai, ringkas, *to-the-point*, dan ramah bagi para software engineer.

---

## 💡 Fitur Penyorotan Sintaks (Syntax Highlighting)

Di dalam antarmuka AI Chat aplikasi **ER-AI Trainer**:
- Setiap blok kode yang dihasilkan oleh `er-ai-code:v1.0` otomatis dianalisis oleh engine **Shiki** (`tokyo-night`).
- Menampilkan badge nama bahasa pemrograman di sudut atas (mis. `typescript`, `tsx`, `json`, `bash`, `python`).
- Dilengkapi tombol salin satu-klik yang memberikan umpan balik visual (*Copied!*).

---

## 🧪 Contoh Permintaan Penggunaan Efektif

```markdown
User:
Buatkan custom React hook 'useDebounce' menggunakan TypeScript ketat lengkap dengan unit test Vitest.
```
```markdown
User:
Saya mengalami bug memory leak pada useEffect di komponen ini: [kode]. Tolong refactor dan jelaskan penyebabnya.
```
