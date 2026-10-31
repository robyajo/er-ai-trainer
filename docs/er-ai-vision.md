# 👁️ Model `er-ai-vision:v1.0`

`er-ai-vision:v1.0` adalah model pemrosesan citra visual multimodal yang mampu melihat, menganalisis, membaca teks, dan memahami konteks foto atau gambar secara mendalam.

---

## 📌 Informasi Teknis Singkat

- **Nama Model**: `er-ai-vision:v1.0`
- **Model Dasar (*Base Model*)**: `moondream:latest` (Moondream 2)
- **Pengembang Basis**: Vikhyat Korrapati
- **Ukuran File**: 1.7 GB
- **Format**: GGUF (`Q4_0`)
- **Arsitektur Dual-Backbone**:
  - **Visual Encoder**: SigLIP / CLIP ViT
  - **Text Decoder**: Phi-2 Language Model
- **Jumlah Parameter**: ~1.86 Miliar parameter gabungan (~1B language backbone)
- **Panjang Konteks**: 2,048 token
- **Parameter Inferensi**:
  - `temperature`: `0.0` (analisis visual konsisten dan faktual)
  - `stop`: `["<|endoftext|>", "Question:"]`

---

## 🔍 Kemampuan & Analisis Visual

1. **Pemahaman Objek & Latar**:
   - Mendeteksi subjek (manusia, pakaian, ekspresi, postur), benda di sekitarnya, serta latar tempat (ruangan kantor, meja, laptop, pencahayaan).
2. **Optical Character Recognition (OCR)**:
   - Mampu mengekstrak teks yang tertulis pada tangkapan layar (screenshot), papan pengumuman, atau dokumen formulir.
3. **Analisis UI/UX Aplikasi**:
   - Mampu memeriksa tata letak desain antarmuka, posisi tombol, hierarki warna, dan elemen grafis.

---

## 🎨 Kolaborasi dengan Studio Pengedit Gambar AI (Background Changer)

Model VLM seperti Moondream bertindak sebagai **Image-to-Text** (menganalisis gambar dan menghasilkan teks penjelasan), bukan generator raster gambar (*image-to-image/diffusion*).

Oleh karena itu, aplikasi **ER-AI Trainer** menyediakan studio khusus di sisi klien:
- **Tombol `🪄 Ubah Latar`** pada setiap bubble gambar di riwayat chat membuka kanvas interaktif.
- Kanvas GPU/Canvas HTML5 secara otomatis memisahkan subjek dari warna latar belakang (dengan algoritma *chroma/color-distance clustering*).
- Pengguna dapat mengganti latar belakang menjadi:
  - ⬛ **Hitam Studio Pekat (`#000000`)**
  - 🌌 **Midnight Navy (`#090d16`)**
  - ⚪ **Putih Bersih**
  - 🪟 **Transparan (PNG Cutout)**
  - 🎨 **Palet Warna Kustom**
- Hasil edit dapat langsung diunduh atau dipasang kembali ke input obrolan dengan sekali klik!

---

## 🧪 Contoh Permintaan Penggunaan Efektif

```markdown
User: [Melampirkan foto ruang kerja]
Jelaskan siapa saja orang yang ada di dalam gambar ini dan apa yang sedang mereka lakukan.
```
```markdown
User: [Melampirkan screenshot error terminal]
Apa pesan kesalahan yang tertulis pada teks di screenshot ini dan apa solusinya?
```
