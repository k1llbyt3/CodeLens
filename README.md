# 🔍 CodeLens

> **Next-Generation Visual Code Tracer & Execution Engine**  
> An interactive algorithm visualization IDE built with **Next.js 14**, **Tailwind CSS**, and **Framer Motion**, featuring real-time step execution, object permanence tracking, and cinematic 2.5D frosted glassmorphism visualizers.

---

## 🌟 Highlights & Working Frontend Capabilities

CodeLens transforms abstract algorithmic execution into physical, spatial state changes with hardware-grade precision.

- 💎 **Ultra-Realistic 2.5D Frosted Glass Monoliths**: Array elements are rendered as monolithic glass cuboids with directional rim-light reflections (`border-t-white/60`, `border-l-white/40`), volumetric inset scattering, and internal glare highlights.
- ⚙️ **Physical Industrial Docking Tray**: Sockets are boolean-recessed metallic wells (`#0d0e12`) with catch-light bottom lips and digital cyan LED index decals.
- 🚡 **Overhead CNC Gantry & Scanners**: Variables (`i`, `j`, `left`, `right`) ride on an extruded steel beam as physical scanner heads with digital OLED readouts and anti-collision upward stacking math.
- 🧠 **Universal Object Permanence Tracking**: Swaps, mutations, and shifts preserve the unique physical identity of array blocks across execution steps via Framer Motion `layoutId`.
- 📝 **Monaco Code Editor**: Fully integrated IDE editor with live step-line tracking, Java syntax highlighting, and keyboard shortcuts.
- ⏱️ **Full-Spectrum Playback Engine**: Scrub, step forward/backward, reset, or autoplay traces at variable speeds (0.25x, 0.5x, 1x).
- 🏷️ **Dynamic State Inspector**:
  - **Variable Cards**: Monitors primitives (`int`, `boolean`, `String`) with mutation badges and change diffs.
  - **Terminal Output**: Real-time standard output console stream (`System.out.println`).
  - **Call Stack**: Interactive stack frame tree for class and method scopes.
- 📦 **Zero-Config Presets with Offline Fallbacks**: Includes preloaded algorithms (Two Sum, Bubble Sort) that run immediately even without a backend connected.

---

## 📐 Architecture & System Overview

```
CodeLens
├── frontend/                     # Next.js 14 App Router + Tailwind + Framer Motion
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # App layout and root styles
│   │   │   ├── page.tsx          # Main IDE workspace, playback state & shortcut engine
│   │   │   └── globals.css       # Custom scrollbars & glassmorphism variables
│   │   ├── components/
│   │   │   ├── CodeEditor.tsx    # Monaco Editor with active line highlight
│   │   │   ├── Header.tsx        # Algorithm preset dropdown & Run button
│   │   │   ├── PlaybackBar.tsx   # Scrub bar, step forward/back, speed selector
│   │   │   ├── ConsoleOutput.tsx # Progressive stdout terminal
│   │   │   └── Visualizer/
│   │   │       ├── ArrayVisualizer.tsx     # 3-Tier arena (Gantry, Monoliths, Tray)
│   │   │       ├── GlassMonolith.tsx       # Translucent frosted glass monolith component
│   │   │       ├── MechanicalClaw.tsx      # Physical CNC Scanner carriage
│   │   │       ├── CNCScannerPointer.tsx   # Scanner head exports
│   │   │       ├── StateVisualizer.tsx     # Tabbed inspector (Visualizer / Terminal / Stack)
│   │   │       ├── VariableCard.tsx        # Primitive variable cards with mutation glow
│   │   │       └── CallStackVisualizer.tsx # Stack frame visualizer
│   │   ├── lib/
│   │   │   ├── objectPermanence.ts         # Block identity engine & swap detection
│   │   │   └── presets.ts                  # Algorithmic code templates & fallback traces
│   │   └── types/
│   │       └── tracer.ts                   # TypeScript trace interfaces & API models
│   ├── package.json
│   └── tailwind.config.ts
│
└── backend/                      # Python / FastAPI Code Tracing Sandbox
```

---

## 🔬 Deep Dive: Working Frontend Components

### 1. The 3-Tier Array Visualizer (`ArrayVisualizer.tsx`)
Separated into three non-colliding visual tiers:
- **Tier 1 (Gantry Rail & Scanners)**: Fixed height ceiling area (`h-20`). The extruded aluminum beam holds CNC Scanners. Overlapping pointers targeting the same index dynamically stack vertically (`indexInGroup * -36px`) with spring physics.
- **Tier 2 (Frosted Glass Monoliths)**: Flexbox flow aligned to the bottom. Each block uses the `GlassMonolith` component with height scaled proportionally to element value. Swaps trigger orbital trajectories (`y: [0, -45, -45, 0]`) synchronized via layout IDs.
- **Tier 3 (Industrial Docking Tray)**: Spans the full visualizer width with sunken socket cavities (`shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)]`) and hanging LED indices (`text-cyan-500`).

### 2. Frosted Glass Shader (`GlassMonolith.tsx`)
Constructed with physical optical properties:
- **Base Translucency**: `bg-white/[0.06] backdrop-blur-md` (or `bg-white/[0.15] backdrop-blur-xl` when active/highlighted).
- **Directional Light Rims**: Top (`border-t-white/60`) and left (`border-l-white/40`) catch light; bottom and right edges stay dark.
- **Volumetric Scattering**: `shadow-[inset_0_0_20px_rgba(255,255,255,0.08),_0_8px_20px_rgba(0,0,0,0.7)]`.
- **Top-Left Glare**: `bg-gradient-to-br from-white/10 via-transparent to-transparent`.
- **Suspended Typography**: Bold monospace values with high-contrast text shadows (`drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`).

### 3. State & Object Permanence Engine (`objectPermanence.ts`)
- Assigns unique, permanent IDs (`block-arr-0`, `block-arr-1`) to array elements upon initialization.
- Replays steps sequentially to determine which elements moved (`isMoving`), are being read (`reading`), written (`writing`), or swapped (`swapping`).
- Extracts pointer positions and identifies active comparison lines (e.g., `arr[j] > arr[j+1]`).

### 4. Playback & Timeline Engine (`page.tsx` & `PlaybackBar.tsx`)
- **Seek Scrub Bar**: Jump directly to any point in execution.
- **Stepping**: Single step back (`←`) or forward (`→`).
- **Autoplay**: Configurable speed intervals (`1x` = 1.5s, `0.5x` = 3s, `0.25x` = 6s).
- **Keyboard Navigation**:
  - `Space`: Toggle Play / Pause.
  - `ArrowRight`: Step Forward.
  - `ArrowLeft`: Step Backward.
  - `Ctrl + Enter` / `Cmd + Enter`: Run Execution.

---

## 🚀 Quick Start (Frontend)

### Prerequisites
- Node.js 18.x or later
- npm or pnpm

### Installation

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Tip**: Even if the backend server is offline, CodeLens automatically runs built-in fallback traces for selected presets (Two Sum, Bubble Sort), allowing full exploration of the visualization system immediately.
