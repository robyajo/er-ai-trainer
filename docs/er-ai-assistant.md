# 🤖 Model `er-ai-assistant:v1.0`

`er-ai-assistant:v1.0` adalah asisten percakapan cerdas yang dirancang untuk kebutuhan interaksi sehari-hari, produktivitas, riset cepat, dan komunikasi berbahasa Indonesia.

---

## 📌 Informasi Teknis Singkat

- **Nama Model**: `er-ai-assistant:v1.0`
- **Model Dasar (*Base Model*)**: `qwen2.5:1.5b`
- **Pengembang Basis**: Alibaba Cloud Qwen Team
- **Ukuran File**: 986 MB
- **Format**: GGUF (`Q4_K_M`)
- **Jumlah Parameter**: 1.5 Miliar (1.5B)
- **Panjang Konteks**: 16,384 token (16K)
- **Parameter Inferensi**:
  - `temperature`: `0.7` (gaya bahasa variatif dan natural)
  - `top_p`: `0.9`
  - `num_ctx`: `16384`

---

## 🎯 Karakteristik & Pedoman Utama

Model ini bertindak sebagai mitra asisten pribadi yang ramah, sopan, dan solutif:

1. **Bahasa Indonesia Natural & Sopan**:
   - Memahami nuansa pertanyaan pengguna dalam Bahasa Indonesia sehari-hari maupun formal.
2. **Jawaban Terstruktur & Padat**:
   - Menghindari jawaban bertele-tele; menyajikan intisari poin menggunakan format markdown yang mudah dibaca.
3. **Langkah Konkret**:
   - Selalu memberikan saran tindakan nyata (*actionable items*) yang dapat langsung dieksekusi pengguna.
4. **Respon Secepat Kilat**:
   - Dengan ukuran bobot di bawah 1 GB, model ini menghasilkan latensi respon terendah di keluarga ER-AI, ideal untuk tanya-jawab cepat.

---

## 🎙️ Integrasi Audio (STT & TTS)

Model `er-ai-assistant:v1.0` dioptimalkan untuk berpasangan dengan fitur suara aplikasi:
- **Speech-to-Text (STT)**: Tekan ikon mikrofon untuk mendiktekan pertanyaan secara langsung melalui suara.
- **Text-to-Speech (TTS)**: Tekan ikon speaker pada bubble pesan asisten untuk mendengarkan jawaban dibacakan dengan artikulasi suara yang jernih.

---

## 🧪 Contoh Permintaan Penggunaan Efektif

```markdown
User:
Tolong buatkan draf email undangan meeting tindak lanjut rilis aplikasi kepada tim stakeholder.
```
```markdown
User:
Apa saja tips menjaga produktivitas saat bekerja secara remote di bidang IT?
```
