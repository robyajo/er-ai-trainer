# 🧠 Model `er-ai-think:v1.0`

`er-ai-think:v1.0` adalah model penalaran logika tingkat tinggi (*deep reasoning*) yang dirancang khusus untuk membedah masalah kompleks, pembuktian bertahap, investigasi akar masalah (*root cause*), dan arsitektur sistem.

---

## 📌 Informasi Teknis Singkat

- **Nama Model**: `er-ai-think:v1.0`
- **Model Dasar (*Base Model*)**: `deepseek-r1:1.5b` (DeepSeek-R1-Distill-Qwen-1.5B)
- **Pengembang Basis**: DeepSeek-AI
- **Ukuran File**: 1.1 GB
- **Format**: GGUF (`Q4_K_M`)
- **Jumlah Parameter**: 1.8 Miliar (1.8B)
- **Panjang Konteks**: 32,768 token (32K)
- **Arsitektur**: Distilled dari model penalaran DeepSeek-R1 (671B MoE) ke dalam arsitektur Qwen 2.5 1.5B
- **Fitur Utama**: *Chain-of-Thought* (CoT) internal dalam tag `<think>...</think>`

---

## 🔬 Mekanisme Kerja: Penalaran Bertahap (*Chain of Thought*)

Saat menerima prompt penalaran, `er-ai-think:v1.0` tidak langsung mengeluarkan kesimpulan acak. Model melakukan *self-deliberation* (monolog berpikir internal):

```
User Prompt
    │
    ▼
[Mulai Proses Berpikir Internal]
<think>
1. Mengurai masalah ke dalam komponen dasar.
2. Membentuk hipotesis awal.
3. Mencari potensi celah, edge cases, atau kontradiksi logika.
4. Memvalidasi hipotesis dan mengeliminasi asumsi keliru.
5. Merumuskan struktur jawaban akhir yang paling solutif.
</think>
    │
    ▼
Jawaban Akhir Terstruktur dalam Bahasa Indonesia
```

---

## 🧩 Integrasi Antarmuka UI (Thinking Accordion)

Di antarmuka aplikasi **ER-AI Trainer**:
- Sistem secara otomatis mendeteksi blok `<think>...</think>`.
- Alur berpikir dipisahkan dari jawaban akhir dan dibungkus dalam **Akordion Berpikir** beranimasi ikon otak 🧠.
- Dilengkapi lencana jumlah karakter berpikir (misalnya `1,420 karakter proses berpikir`).
- Pengguna dapat melipat atau membuka akordion ini kapan saja sehingga jawaban akhir tetap rapi dan nyaman dibaca.

---

## 🎯 Fokus Bidang Penggunaan

1. **Investigasi Akar Masalah (*Root-Cause Analysis*)**:
   - Menganalisis log error rumit, kondisi *race condition*, atau *memory leak*.
2. **Evaluasi Desain Arsitektur**:
   - Memilih antara arsitektur Event-Driven vs REST, atau merancang skema relasi database skala besar.
3. **Logika Algoritma & Matematika**:
   - Menghitung kompleksitas waktu (*Big-O notation*), alur rekursif, atau penyusunan graf.

---

## 🧪 Contoh Permintaan Penggunaan Efektif

```markdown
User:
Kami memiliki aplikasi web dengan ribuan websocket concurrent connections yang tiba-tiba drop setiap 15 menit. Bagaimana alur sistematis untuk menginvestigasi akar masalahnya?
```
```markdown
User:
Bandingkan trade-off antara arsitektur Micro-frontends dengan Monorepo Modular untuk tim beranggotakan 20 insinyur perangkat lunak.
```
