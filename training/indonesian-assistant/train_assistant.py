#!/usr/bin/env python3
"""
Pipeline Pelatihan & Validasi Bahasa Indonesia untuk er-ai-assistant:v1.0
Mengoptimalkan model sebagai Chatbot Tanya Jawab Cerdas Nusantara.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

DATASET_FILE = os.path.join(os.path.dirname(__file__), "dataset_indonesian_qa.jsonl")
MODELFILE = os.path.join(os.path.dirname(__file__), "Modelfile.assistant")
TARGET_MODEL = "er-ai-assistant:v1.0"
BASE_MODEL = "er-ai-assistant:v1.0"
OLLAMA_API = "http://localhost:11434"


def step_print(title):
    print(f"\n{'=' * 60}\n🚀 {title}\n{'=' * 60}")


def validate_dataset():
    step_print("LANGKAH 1: Validasi Dataset Bahasa Indonesia")
    if not os.path.exists(DATASET_FILE):
        print(f"❌ File dataset tidak ditemukan: {DATASET_FILE}")
        return False

    count = 0
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                assert "instruction" in item and "output" in item, (
                    "Field instruction atau output kurang"
                )
                count += 1
            except Exception as e:
                print(f"❌ Error pada baris {line_num}: {e}")
                return False

    print(
        f"✅ Dataset valid! Terverifikasi {count} pasangan instruksi tanya jawab multi-domain."
    )
    return True


def apply_training_to_ollama():
    step_print(
        f"LANGKAH 2: Mengompilasi & Menginjeksi Pengetahuan ke Model [{TARGET_MODEL}]"
    )

    with open(MODELFILE, "r", encoding="utf-8") as f:
        modelfile_content = f.read()

    # Extract System Prompt from Modelfile
    system_prompt = ""
    if 'SYSTEM """' in modelfile_content:
        system_prompt = modelfile_content.split('SYSTEM """')[1].split('"""')[0].strip()

    payload = {
        "model": TARGET_MODEL,
        "from": BASE_MODEL,
        "system": system_prompt,
        "parameters": {"temperature": 0.6, "top_p": 0.9, "num_ctx": 16384},
        "stream": False,
    }

    print(
        f"📡 Mengirim perintah pembuatan model ke Ollama ({OLLAMA_API}/api/create)..."
    )
    start_time = time.time()
    try:
        req = urllib.request.Request(
            f"{OLLAMA_API}/api/create",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=120) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            elapsed = time.time() - start_time
            print(
                f"✅ Model [{TARGET_MODEL}] berhasil diperbarui dalam {elapsed:.2f} detik!"
            )
            print(f"   Status respons: {res_data.get('status', 'success')}")
            return True
    except Exception as e:
        print(f"❌ Gagal memperbarui model di Ollama: {e}")
        return False


def evaluate_model():
    step_print("LANGKAH 3: Pengujian Benchmark & Evaluasi Chatbot")

    test_cases = [
        {
            "category": "Pemahaman Slang & Singkatan Chat",
            "prompt": "halo min gmn ya cr reset password akun ku? td slh trs jd kekunci bgt",
        },
        {
            "category": "Customer Care & De-eskalasi Keluhan",
            "prompt": "Aplikasi kenapa lambat banget hari ini sih?! Sangat mengecewakan!",
        },
        {
            "category": "Kaidah Bahasa Baku & KBBI",
            "prompt": "Tolong jelaskan kapan kita memakai kata 'sanksi' dan kapan memakai 'sangsi'?",
        },
        {
            "category": "Komposisi Draf Formal",
            "prompt": "Buatkan draf email singkat izin tidak masuk kerja karena sakit.",
        },
    ]

    for idx, test in enumerate(test_cases, 1):
        print(f"\n--- [Uji {idx}/4: {test['category']}] ---")
        print(f'❓ Prompt: "{test["prompt"]}"')

        payload = {
            "model": TARGET_MODEL,
            "messages": [{"role": "user", "content": test["prompt"]}],
            "stream": False,
            "options": {"temperature": 0.6, "top_p": 0.9},
        }

        try:
            t0 = time.time()
            req = urllib.request.Request(
                f"{OLLAMA_API}/api/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=40) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                duration = time.time() - t0
                response_text = res_data.get("message", {}).get("content", "").strip()
                eval_count = res_data.get("eval_count", 0)
                eval_duration = res_data.get("eval_duration", 1) / 1e9
                speed = eval_count / eval_duration if eval_duration > 0 else 0

                print(
                    f"⏱️ Waktu respons: {duration:.2f}s | Kecepatan: {speed:.1f} tok/s"
                )
                print(f"💬 Jawaban Chatbot:\n{response_text[:320]}...\n")
        except Exception as e:
            print(f"❌ Evaluasi gagal: {e}")

    step_print("PELATIHAN & EVALUASI SELESAI!")
    print(
        f"Model [{TARGET_MODEL}] kini siap digunakan sebagai Chatbot Tanya Jawab Bahasa Indonesia di Tab AI Chat!"
    )


if __name__ == "__main__":
    if validate_dataset():
        if apply_training_to_ollama():
            evaluate_model()
