# DESIGN.md — ER-AI Trainer Studio Design System

> Reverse-engineered & crafted following the **VoltAgent/awesome-design-md** developer & AI agent guidelines.  
> Aesthetic Archetype: **Supabase + Linear Developer Teal Platform** (Dark-Mode Native, High-Density Technical Canvas, Hairline Borders, Luminous Teal Accents).

---

## 1. Design DNA & Philosophy

- **Developer-Centric & Precise**: Clean, density-aware layout tailored for developers working with local LLMs (Ollama, Zed, Cursor).
- **Dark Mode First with Teal Luminescence**: Deep obsidian canvas (`#0f1418` / `oklch(0.135 0.015 198)`) highlighted by energized Teal / Mint accents (`#14b8a6` / `#2dd4bf`).
- **Hairline Borders & Micro-Layers**: Subtle semi-transparent borders (`border-border/70`) with soft glow on focus and hover, avoiding heavy drop shadows.
- **Micro-Typography**: Dual-font typography pairing **Inter Variable** for geometric UI hierarchy and **Geist Mono** for code, tokens, telemetry, and paths.

---

## 2. Color Palette (OKLCH & Hex)

### Dark Mode (Primary Canvas)
- **Background (Canvas)**: `oklch(0.135 0.015 198)` (~`#0d1216`) — Deep Oceanic Obsidian
- **Card Surface**: `oklch(0.165 0.018 198)` (~`#131a20`) — Elevated Slate Panel
- **Border / Divider**: `oklch(0.25 0.02 195 / 80%)` — Hairline Border
- **Primary Accent (Teal Glow)**: `oklch(0.72 0.15 180)` (~`#14b8a6` / `#2dd4bf`)
- **Primary Foreground**: `oklch(0.13 0.03 195)` (Deep Contrast Text)
- **Muted Foreground**: `oklch(0.65 0.025 190)` (~`#8ba2ad`)
- **Telemetry Emerald**: `oklch(0.72 0.17 155)` (Online / Verified Check)
- **Terminal Canvas**: `oklch(0.10 0.015 200)` (Pure Obsidian Code Matrix)

### Light Mode (Secondary Canvas)
- **Background**: `oklch(0.99 0.003 185)` (Off-white Teal Ice)
- **Card Surface**: `oklch(1 0 0)` (Pure Clean Paper)
- **Primary Accent**: `oklch(0.55 0.14 185)` (~`#0d9488` / `#0f766e`)
- **Border**: `oklch(0.91 0.01 185)` (Soft Teal Slate Border)

---

## 3. Typography & Rhythm

- **UI Sans**: `Inter Variable`, `-apple-system`, `system-ui`, sans-serif
- **Code & Telemetry**: `Geist Mono`, `ui-monospace`, monospace
- **Tracking & Caps**:
  - Section Headers: `text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground`
  - Stat Badges: `text-xs font-mono font-bold tracking-tight`
  - Body Text: `text-xs leading-relaxed`

---

## 4. Responsive Layout System

- **Desktop (>= 1024px / `lg`)**: Two-column split layout with fixed/fluid left control rail (`lg:w-[360px] xl:w-[400px]`) and expanding editor canvas.
- **Tablet & Compact (< 1024px)**: Responsive segmented tab navigation (`[📂 Proyek & Model]` vs `[📝 Editor & Pelatihan]`), allowing seamless switching without horizontal scrolling.
- **Adaptive Card Containers**: Dynamic padding (`p-3 sm:p-4`), wrapped button action bars, and flexible template grids (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-6`).
- **Telemetry & Dialogs**: Viewport-aware modals (`max-w-[95vw] sm:max-w-[650px] max-h-[88vh]`), auto-scrollable code & log panels.
