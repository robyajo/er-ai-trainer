# 🇮🇩 Panduan Pelatihan Chatbot Tanya Jawab Bahasa Indonesia (`er-ai-assistant:v1.0`)

Dokumen ini memuat panduan lengkap, silabus kurikulum kebahasaan, dataset instruksi, dan script otomatis untuk melatih model **`er-ai-assistant:v1.0`** agar menguasai seluruh spektrum bahasa Indonesia untuk kebutuhan **Chatbot Tanya Jawab Cerdas (Q&A Chatbot)**.

---

## 🎯 Tujuan Pelatihan & Persona Model

Model ini difokuskan sebagai **Customer Support & Daily Conversational Assistant** dengan kriteria:
1. **Paham Bahasa Gaul & Singkatan Chat**: Mampu menafsirkan pertanyaan cepat pengguna yang mengandung singkatan (`yg`, `bgt`, `gmn`, `kpn`, `knp`, `udh`, `blm`, `kuy`, `mager`).
2. **Empati & De-eskalasi Keluhan**: Menggunakan prinsip 3S (Senyum, Salam, Sapa) dan teknik penanganan komplain pelanggan secara tenang dan menenangkan tanpa nada defensif.
3. **Kaidah PUEBI / EYD V & KBBI**: Mampu menjelaskan perbedaan kata mirip (seperti *sanksi* vs *sangsi*), peluluhan fonem KTSP (*memesona*, *mengubah*), dan struktur kalimat SPOK yang efektif.
4. **Format Jawaban Rapi**: Memanfaatkan daftar bernomor, bullet points, dan penekanan teks tebal agar solusi mudah dipahami di layar ponsel maupun desktop.

---

## 📚 7 Pilar Kurikulum Pelatihan Kebahasaan

| Modul | Domain Materi | Fokus Kemampuan |
| :--- | :--- | :--- |
| **Modul 1** | **Morfologi & Ejaan (EYD V)** | Afiksasi (me-, di-, ke-an, ber-), peluluhan KTSP, penghindaran pleonasme |
| **Modul 2** | **Kosakata & Semantik (KBBI)** | Homonim, paronim, tingkat kehalusan tutur kata, konjungsi antarkalimat |
| **Modul 3** | **Bahasa Kolokial & Slang** | Decoding singkatan chat cepat, partikel percakapan (*sih, dong, nih, kan, deh*) |
| **Modul 4** | **Customer Service & Q&A** | Salam ramah, empati keluhan, klarifikasi proaktif, closing chat hangat |
| **Modul 5** | **Budaya & Pengetahuan Nusantara** | Administrasi sipil (KTP, BPJS, SIM, SKCK), kuliner daerah, peribahasa/pepatah |
| **Modul 6** | **Komposisi Surat & Draf** | Email izin kerja/sakit, lamaran kerja, surat permohonan, broadcast WhatsApp |
| **Modul 7** | **Logika & Tanya Jawab Konseptual** | Metode piramida terbalik, analogi sederhana untuk anak-anak, langkah solutif |

---

## 📁 Struktur Berkas Pelatihan

Seluruh materi dan script pelatihan tersimpan di dalam folder:
[`training/indonesian-assistant/`](file:///home/roby/Documents/PROJECT/er-ai-trainer/training/indonesian-assistant/)

```
training/indonesian-assistant/
├── CURRICULUM.md                 <- Silabus kurikulum 7 modul bahasa Indonesia
├── dataset_indonesian_qa.jsonl   <- Dataset pasangan instruksi Q&A multi-domain
├── Modelfile.assistant           <- Modelfile persona khusus chatbot Indonesia
└── train_assistant.py            <- Script validasi, injeksi ke Ollama, & evaluasi benchmark
```

---

## 🚀 Cara Menjalankan Pelatihan Otomatis

Untuk mengompilasi dataset dan memperbarui pengetahuan bahasa Indonesia pada model:

```bash
# Masuk ke direktori proyek
cd /home/roby/Documents/PROJECT/er-ai-trainer

# Jalankan pipeline pelatihan
python3 training/indonesian-assistant/train_assistant.py
```

### Output Evaluasi:
- **Validasi Dataset**: Memverifikasi integritas format JSONL (instruksi dan output).
- **Injeksi ke Ollama**: Mengupdate model `er-ai-assistant:v1.0` secara instan via endpoint `/api/create`.
- **Benchmark Evaluasi**: Menguji 4 skenario riil (Slang chat, komplain pengguna, KBBI ejaan baku, dan draf email formal) dengan metrik kecepatan ~60–80 token/detik.
