# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PixCalli Studio — a sprite / pixel-art editor shipped as both a Vite web app and an Electron desktop app (`com.pixcalli.studio`). React 19 + Pixi.js + three.js + a hand-rolled WebGL paint buffer. UI, comments, and variable names are primarily in Spanish — keep that convention when editing.

## Commands

- `npm run dev` — Vite dev server on `http://localhost:5173` (host `0.0.0.0`, so Electron and other devices can reach it).
- `npm run build` — production bundle to `dist/`.
- `npm run lint` — ESLint over the whole tree (`eslint .`). No test runner is configured.
- `npm run electron:dev` — runs Vite + Electron together; Electron loads `VITE_DEV_SERVER=http://localhost:5173`.
- `npm run electron:prod` — builds then launches Electron against `dist/`.
- `npm run electron:debug` — Electron with `--inspect=9229` and verbose logging.
- `npm run dist` — Vite build + `electron-builder` packaging (targets: Linux AppImage, macOS dmg/zip).

Electron startup always passes heavy GPU/V8 flags (`--max-old-space-size=8192`, `--enable-gpu-rasterization`, `--enable-accelerated-2d-canvas`, `--force-gpu-mem-available-mb=2048`, `VaapiVideoDecoder`). If you add a new npm script that launches Electron, mirror those flags — the canvas pipeline assumes them.

## Architecture

### Entry flow
`src/main.jsx` → `src/App.jsx` → `editorSprites/Editor/editorMain.jsx` → either `InitializeProject` (project picker / loader) or `CanvasTracker` (the full editor). `CanvasTracker` is the default export of `editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` and is where almost all editor state lives.

### Where the weight sits
Two files do most of the heavy lifting and are intentionally very large:

- `editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` (~12k lines) — the monolithic editor: toolbar, canvas, pointer dispatch, layer/frame state, undo/redo, clipboard, onion skin, reflex mode, save/export wiring, 3D modals.
- `editorSprites/Workspace/hooks/hooks.jsx` (~7.6k lines) — `usePointer` (throttled pointer tracking at ~60fps with refs to avoid re-renders) and `useLayerManager` (authoritative layer/frame/group/animation state). Almost every feature flows through one of these two hooks.

When extending behavior, prefer adding to the existing hook or to a sibling module under `Workspace/` rather than splitting these files — the rest of the editor imports named members from them and a partial split breaks a lot at once.

### Rendering pipeline
The canvas is **not** a React-rendered `<canvas>` tree. It's a raw WebGL texture buffer:

- `Workspace/hooks/useWebGLPaintBuffer.js` owns the GL context, shaders (trivial vertex + `texture2D` fragment), and texture uploads. It's driven by `canvasWidth`, `canvasHeight`, `zoom`, and `viewportOffset`.
- Pixi.js (`@pixi/react`, `pixi.js`, `pixi-painter`) is used for overlays / brush preview.
- three.js (`@react-three/fiber`, `@react-three/drei`, `three-stdlib`) powers the 3D modals (`ThreeJsDemo.jsx`, `Threeloader.jsx`) used for reference and "flattening" 3D models into pixel frames.

Heavy pixel operations run off the main thread in Web Workers — keep this pattern when adding expensive ops:

- `Workspace/workspaceMain/boundsWorker.js` (imported via `?worker`) — bounding-box computation.
- `Workspace/hooks/image-processor-worker.js` and `Workspace/workers/imageDataWorker.js` — image data transforms.
- `Workspace/hooks/optimizedFloodFill.js` — worker-backed flood fill (`useOptimizedFloodFill`).
- `Workspace/rotesprite.js` / `webglRotesprite.js` — rotsprite-style rotation.

### Tools
Each drawing tool is a module under `editorSprites/Workspace/customTool/tools/` (`pencilTool.jsx`, `eraserTool.jsx`, `fillTool.jsx`, `lineTool.jsx`, `curveTool.jsx`, `squareTool.jsx`, `circleTool.jsx`, `ellipseTool.jsx`, `triangleTool.jsx`, `polygonTool.jsx`, `selectTool.jsx`, `brushSelect.jsx`, `smudgeTool.jsx`, `blurFingerTool.jsx`, `lightTool.jsx`, `darkTool.jsx`, `colorPicker.jsx`, etc.). `customTool/toolsMap.jsx` is the legacy minimal dispatch table (only `pencil` + `eraser`); the real per-tool wiring is done inside `workspaceContainer.jsx` via the `TOOLS` constant and pointer handlers. New tools need both a module under `tools/` and a branch in the pointer pipeline inside `workspaceContainer.jsx`.

### Project save / load
Projects are stored through the **File System Access API** (`window.showDirectoryPicker`). `InitializeProject` remembers the chosen folder name in `localStorage` (`defaultProjectFolder`); `editorSprites/Workspace/saveProject.jsx` writes files back. This means Chromium-based browsers and Electron work, but Firefox/Safari won't — preserve the `supportsFileSystemAccess` capability check when touching load/save code.

### Export
Animation / video export lives in `Workspace/export/` (`animationExporter.jsx`, `videoExporter.js`).

### Electron shell
`electron/main.js` creates a single `BrowserWindow` titled "PixCalli Studio", disables the default app menu, registers F11 → fullscreen, and disables `backgroundThrottling` so the canvas keeps rendering when unfocused. `contextIsolation: true` + `nodeIntegration: false` — there is no preload bridge, so renderer code cannot call Node directly. If you need IPC, add a `preload.js` and wire `contextBridge`.

## Build / tooling notes

- **React Compiler is on.** `vite.config.js` enables `babel-plugin-react-compiler` with `compilationMode: 'all'`. Don't hand-memoize everything; let the compiler do it. But note: the compiler cannot optimize through the pervasive `useRef` + imperative mutation style used in `hooks.jsx` and `workspaceContainer.jsx` — that's intentional (avoids re-renders during pointer drags) and should be preserved.
- **ESLint** (`eslint.config.js`): `no-unused-vars` ignores identifiers starting with an uppercase letter or underscore (`varsIgnorePattern: '^[A-Z_]'`). Components and intentionally-unused refs already follow this.
- Two React plugins are installed (`@vitejs/plugin-react` and `@vitejs/plugin-react-swc`); only the Babel one is active — required, because React Compiler runs as a Babel plugin. Do not switch to SWC without migrating the compiler plugin.
- `base: './'` in Vite config is required so the built `dist/` works when loaded from `file://` inside Electron.
