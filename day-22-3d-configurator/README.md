# Day 22 — 3D Product Configurator

A real-time 3D sneaker configurator built with React Three Fiber. Customize colors, materials, and camera angles — all in a studio-lit environment.

## ✨ Features

- **3D Sneaker Model** — Built entirely from Three.js primitives (no external model files)
- **Part Selection** — Click any part on the model or pick from the panel to customize
- **8 Preset Colors** — Plus custom color picker and hex input
- **Material Switching** — Matte, Glossy, and Metallic finishes with smooth animated transitions
- **Camera Presets** — Front, Side, Top, and 3/4 View with smooth tweening
- **Screenshot Capture** — Download your custom sneaker as a PNG
- **Studio Lighting** — HDRI environment, three-point lighting, contact shadows
- **Auto-Rotate** — Idle rotation that pauses on interaction
- **Loading Screen** — Animated progress bar while assets load
- **Responsive** — Mobile drawer panel with compact controls

## 🛠 Tech Stack

| Tech | Purpose |
|------|---------|
| React | UI components |
| React Three Fiber | 3D rendering |
| Drei | R3F helpers (OrbitControls, Environment, ContactShadows) |
| Three.js | 3D primitives, materials, lighting |
| Vite | Build tool |

## 🚀 Run Locally

```bash
npm install
npm run dev
```

## 📦 Build

```bash
npm run build
npm run preview
```
