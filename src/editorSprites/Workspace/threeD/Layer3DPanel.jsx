// Panel lateral derecho para configurar una capa 3D activa.
// Reutiliza el mismo lenguaje visual del visor 3D modal (CSS t3d-* + tokens
// del topToolbar) y los mismos iconos. Cada control escribe directamente
// sobre framesResume.extensions.threeDLayers[layerId] vía setLayerThreeD —
// el use3DLayer hook detecta el cambio y re-renderiza la capa.
//
// La sección "Frame actual" sólo aparece cuando hay frames > 1; permite
// override por frame de rotación y tiempo de animación. Los demás
// parámetros (brillo, outlines, color mode...) son globales para la capa.

import React, { useState, useRef } from "react";
import {
  IconBox, IconSliders, IconShapes, IconPalette, IconFilm,
  IconUpload, IconChevronDown, IconRefresh,
  Section,
} from "./icons";
import { acquireRenderer, getRendererIfAlive } from "./ThreeDLayerRenderer";
import { storeBuffer } from "./threeDAssetStore";
import "../workspaceMain/threejs.css";

const Layer3DPanel = ({
  layerId,
  metadata,
  currentFrame,
  totalFrames,
  setLayerThreeD,
  setLayer3DFrameOverride,
  onClose,
}) => {
  const [collapsed, setCollapsed] = useState({
    modelo: false,
    frame: false,
    render: false,
    contornos: false,
    color: false,
    animacion: false,
  });
  const toggleSection = (key) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const fileInputRef = useRef(null);

  // Animaciones disponibles del modelo cacheado. Computado en cada render —
  // el React Compiler maneja la memoización automáticamente (CLAUDE.md
  // reco: no usar useMemo manual para valores derivados). El cache del
  // renderer es estable por sha1, así que es barato consultar.
  const availableAnimations = (() => {
    const renderer = getRendererIfAlive();
    if (!renderer || !metadata?.asset?.sha1) return [];
    const entry = renderer.modelCache.get(metadata.asset.sha1);
    if (!entry?.animations) return [];
    return entry.animations.map((a, i) => a.name || `Clip ${i + 1}`);
  })();

  if (!metadata) {
    return (
      <aside className="t3d-controls" aria-label="Panel de capa 3D">
        <header className="t3d-controls__header">
          <span className="t3d-controls__header-icon"><IconBox size={16} /></span>
          <div>
            <div className="t3d-controls__title">Capa 3D</div>
            <div className="t3d-controls__subtitle">Sin metadata</div>
          </div>
        </header>
      </aside>
    );
  }

  const { asset, base, frameOverrides } = metadata;
  const override = frameOverrides?.[currentFrame] || {};

  // ===== Helpers para escribir =====
  const setBase = (patch) => {
    setLayerThreeD(layerId, (prev) => ({
      ...prev,
      base: { ...prev.base, ...patch },
    }));
  };
  const setOutline = (patch) => {
    setLayerThreeD(layerId, (prev) => ({
      ...prev,
      base: { ...prev.base, outline: { ...prev.base.outline, ...patch } },
    }));
  };
  const setAnimation = (patch) => {
    setLayerThreeD(layerId, (prev) => ({
      ...prev,
      base: { ...prev.base, animation: { ...prev.base.animation, ...patch } },
    }));
  };
  const setOverride = (patch) => {
    setLayer3DFrameOverride(layerId, currentFrame, patch);
  };

  const handleLoadModel = async (file) => {
    const renderer = acquireRenderer();
    const buffer = await file.arrayBuffer();
    const { sha1, filename } = await renderer.loadModelFromBuffer(buffer, file.name);
    storeBuffer(sha1, buffer, filename);
    setLayerThreeD(layerId, (prev) => ({
      ...prev,
      asset: { sha1, filename, relativePath: null },
    }));
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ===== Render =====
  return (
    <aside className="t3d-controls" aria-label="Panel de capa 3D" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 50000 }}>
      <header className="t3d-controls__header">
        <span className="t3d-controls__header-icon"><IconBox size={16} /></span>
        <div style={{ flex: 1 }}>
          <div className="t3d-controls__title">Capa 3D</div>
          <div className="t3d-controls__subtitle">
            {asset?.filename || "Sin modelo cargado"}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Cerrar panel"
            style={{
              background: 'transparent', border: 'none', color: '#b8b8b8',
              cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1,
            }}
          >×</button>
        )}
      </header>

      <div className="t3d-controls__scroll">

        {/* === MODELO === */}
        <Section
          id="modelo" icon={<IconBox />} title="Modelo"
          open={!collapsed.modelo} onToggle={toggleSection}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLoadModel(file);
              e.target.value = ""; // permitir reseleccionar el mismo archivo
            }}
          />
          <button
            type="button"
            className="t3d-btn"
            onClick={triggerFilePicker}
          >
            <IconUpload className="t3d-btn__icon" />
            {asset ? "Cambiar modelo" : "Cargar modelo GLB"}
          </button>
          {asset && (
            <div className="t3d-hint" role="note">
              <IconBox className="t3d-hint__icon" />
              <span>
                <strong>{asset.filename}</strong>
                <br />
                <span style={{ opacity: 0.6, fontSize: 10.5 }}>
                  sha1: {asset.sha1.substring(0, 12)}…
                </span>
              </span>
            </div>
          )}
        </Section>

        {/* === FRAME ACTUAL === */}
        {totalFrames > 1 && asset && (
          <Section
            id="frame" icon={<IconFilm />} title={`Frame ${currentFrame} de ${totalFrames}`}
            open={!collapsed.frame} onToggle={toggleSection}
          >
            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Rotación Y</span>
                <span className="t3d-value">
                  {Math.round(((override.rotation?.[1] || 0) * 180) / Math.PI)}°
                </span>
              </div>
              <input
                className="t3d-slider"
                type="range" min={-Math.PI} max={Math.PI} step={0.01}
                value={override.rotation?.[1] || 0}
                onChange={(e) => {
                  const y = parseFloat(e.target.value);
                  const r = override.rotation || [0, 0, 0];
                  setOverride({ rotation: [r[0], y, r[2]] });
                }}
              />
            </div>

            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Rotación X</span>
                <span className="t3d-value">
                  {Math.round(((override.rotation?.[0] || 0) * 180) / Math.PI)}°
                </span>
              </div>
              <input
                className="t3d-slider"
                type="range" min={-Math.PI} max={Math.PI} step={0.01}
                value={override.rotation?.[0] || 0}
                onChange={(e) => {
                  const x = parseFloat(e.target.value);
                  const r = override.rotation || [0, 0, 0];
                  setOverride({ rotation: [x, r[1], r[2]] });
                }}
              />
            </div>

            {base.animation?.clipIndex >= 0 && availableAnimations.length > 0 && (
              <div className="t3d-row">
                <div className="t3d-row__head">
                  <span className="t3d-label">Tiempo animación</span>
                  <span className="t3d-value">
                    {(override.animationTime != null
                      ? override.animationTime
                      : ((currentFrame - 1) / Math.max(1, totalFrames - 1))).toFixed(2)}
                  </span>
                </div>
                <input
                  className="t3d-slider"
                  type="range" min={0} max={2} step={0.01}
                  value={override.animationTime != null ? override.animationTime : 0}
                  onChange={(e) => setOverride({ animationTime: parseFloat(e.target.value) })}
                />
              </div>
            )}

            <button
              type="button"
              className="t3d-btn"
              onClick={() => setLayer3DFrameOverride(layerId, currentFrame, null)}
              title="Volver a usar valores base + autoTimeline en este frame"
            >
              <IconRefresh className="t3d-btn__icon" />
              Resetear frame a base
            </button>
          </Section>
        )}

        {/* === RENDER === */}
        <Section
          id="render" icon={<IconSliders />} title="Render"
          open={!collapsed.render} onToggle={toggleSection}
        >
          <div className="t3d-row">
            <div className="t3d-row__head">
              <span className="t3d-label">Brillo</span>
              <span className="t3d-value">{(base.brightness || 1).toFixed(2)}</span>
            </div>
            <input
              className="t3d-slider"
              type="range" min={0} max={3} step={0.01}
              value={base.brightness || 1}
              onChange={(e) => setBase({ brightness: parseFloat(e.target.value) })}
            />
          </div>

          <div className="t3d-row">
            <div className="t3d-row__head">
              <span className="t3d-label">Render scale (1/n)</span>
              <span className="t3d-value">{base.renderScale}×</span>
            </div>
            <select
              className="t3d-select"
              value={base.renderScale}
              onChange={(e) => setBase({ renderScale: parseInt(e.target.value, 10) })}
            >
              <option value={1}>1 — nativo</option>
              <option value={2}>1/2 — half</option>
              <option value={4}>1/4 — pixelado suave</option>
              <option value={6}>1/6 — hello-threejs</option>
              <option value={8}>1/8 — máximo crunch</option>
            </select>
          </div>

          <label className="t3d-toggle">
            <input
              type="checkbox"
              checked={!!base.antiAlias}
              onChange={(e) => setBase({ antiAlias: e.target.checked })}
            />
            <span className="t3d-toggle__track" aria-hidden="true" />
            <span className="t3d-toggle__text">Anti-aliasing</span>
          </label>
        </Section>

        {/* === CONTORNOS === */}
        <Section
          id="contornos" icon={<IconShapes />} title="Contornos"
          open={!collapsed.contornos} onToggle={toggleSection}
        >
          <label className="t3d-toggle">
            <input
              type="checkbox"
              checked={!!base.outline?.enabled}
              onChange={(e) => setOutline({ enabled: e.target.checked })}
            />
            <span className="t3d-toggle__track" aria-hidden="true" />
            <span className="t3d-toggle__text">Activar outlines</span>
          </label>

          {base.outline?.enabled && (
            <>
              <div className="t3d-edge-group">
                <div className="t3d-edge-group__title">Silueta exterior</div>
                <div className="t3d-row">
                  <div className="t3d-row__head">
                    <span className="t3d-label">Intensidad</span>
                    <span className="t3d-value">{(base.outline.depthStrength || 0).toFixed(2)}</span>
                  </div>
                  <input
                    className="t3d-slider"
                    type="range" min={0} max={1} step={0.01}
                    value={base.outline.depthStrength || 0}
                    onChange={(e) => setOutline({ depthStrength: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="t3d-row">
                  <div className="t3d-row__head"><span className="t3d-label">Color</span></div>
                  <div className="t3d-color">
                    <input
                      type="color"
                      className="t3d-color__swatch"
                      value={base.outline.depthColor || "#000000"}
                      onChange={(e) => setOutline({ depthColor: e.target.value })}
                    />
                    <span className="t3d-color__hex">{base.outline.depthColor || "#000000"}</span>
                  </div>
                </div>
              </div>

              <div className="t3d-edge-group">
                <div className="t3d-edge-group__title">Caras internas</div>
                <div className="t3d-row">
                  <div className="t3d-row__head">
                    <span className="t3d-label">Intensidad</span>
                    <span className="t3d-value">{(base.outline.normalStrength || 0).toFixed(2)}</span>
                  </div>
                  <input
                    className="t3d-slider"
                    type="range" min={0} max={1} step={0.01}
                    value={base.outline.normalStrength || 0}
                    onChange={(e) => setOutline({ normalStrength: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="t3d-row">
                  <div className="t3d-row__head">
                    <span className="t3d-label">Umbral angular</span>
                    <span className="t3d-value">{(base.outline.normalThreshold || 0).toFixed(2)}</span>
                  </div>
                  <input
                    className="t3d-slider"
                    type="range" min={0.02} max={0.5} step={0.01}
                    value={base.outline.normalThreshold || 0.15}
                    onChange={(e) => setOutline({ normalThreshold: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="t3d-row">
                  <div className="t3d-row__head"><span className="t3d-label">Color</span></div>
                  <div className="t3d-color">
                    <input
                      type="color"
                      className="t3d-color__swatch"
                      value={base.outline.normalColor || "#000000"}
                      onChange={(e) => setOutline({ normalColor: e.target.value })}
                    />
                    <span className="t3d-color__hex">{base.outline.normalColor || "#000000"}</span>
                  </div>
                </div>
                <label className="t3d-toggle">
                  <input
                    type="checkbox"
                    checked={!!base.outline.detectOccluded}
                    onChange={(e) => setOutline({ detectOccluded: e.target.checked })}
                  />
                  <span className="t3d-toggle__track" aria-hidden="true" />
                  <span className="t3d-toggle__text">Detectar a través de oclusión</span>
                </label>
              </div>
            </>
          )}
        </Section>

        {/* === COLOR Y EFECTOS === */}
        <Section
          id="color" icon={<IconPalette />} title="Color y efectos"
          open={!collapsed.color} onToggle={toggleSection}
        >
          <div className="t3d-row">
            <div className="t3d-row__head"><span className="t3d-label">Modo de color</span></div>
            <select
              className="t3d-select"
              value={base.colorMode || "none"}
              onChange={(e) => setBase({ colorMode: e.target.value })}
            >
              <option value="none">Sin efectos</option>
              <option value="poster">Posterizado</option>
              <option value="toon">Toon shading</option>
              <option value="contrast">Alto contraste</option>
            </select>
          </div>

          <div className="t3d-row">
            <div className="t3d-row__head"><span className="t3d-label">Aplanado geométrico</span></div>
            <select
              className="t3d-select"
              value={base.flattenMode || "none"}
              onChange={(e) => setBase({ flattenMode: e.target.value })}
            >
              <option value="none">Sin aplanar</option>
              <option value="flatten-z">Profundidad (Z)</option>
              <option value="flatten-y">Altura (Y)</option>
              <option value="flatten-x">Ancho (X)</option>
            </select>
          </div>

          {base.flattenMode && base.flattenMode.startsWith("flatten-") && (
            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Intensidad aplanado</span>
                <span className="t3d-value">{(base.flattenAmount || 0).toFixed(2)}</span>
              </div>
              <input
                className="t3d-slider"
                type="range" min={0} max={1} step={0.01}
                value={base.flattenAmount || 0}
                onChange={(e) => setBase({ flattenAmount: parseFloat(e.target.value) })}
              />
            </div>
          )}
        </Section>

        {/* === ANIMACIÓN === */}
        {availableAnimations.length > 0 && (
          <Section
            id="animacion" icon={<IconFilm />} title="Animación"
            open={!collapsed.animacion} onToggle={toggleSection}
          >
            <div className="t3d-row">
              <div className="t3d-row__head"><span className="t3d-label">Clip activo</span></div>
              <select
                className="t3d-select"
                value={base.animation?.clipIndex ?? -1}
                onChange={(e) => setAnimation({ clipIndex: parseInt(e.target.value, 10) })}
              >
                <option value={-1}>Sin animación</option>
                {availableAnimations.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>

            {base.animation?.clipIndex >= 0 && (
              <>
                <label className="t3d-toggle">
                  <input
                    type="checkbox"
                    checked={!!base.animation?.autoTimeline}
                    onChange={(e) => setAnimation({ autoTimeline: e.target.checked })}
                  />
                  <span className="t3d-toggle__track" aria-hidden="true" />
                  <span className="t3d-toggle__text">
                    Auto-sincronizar con timeline
                    <span className="t3d-toggle__hint">
                      Cada frame del editor muestra una pose distinta del clip
                    </span>
                  </span>
                </label>
                <div className="t3d-row">
                  <div className="t3d-row__head">
                    <span className="t3d-label">Velocidad</span>
                    <span className="t3d-value">{(base.animation.speed || 1).toFixed(1)}×</span>
                  </div>
                  <input
                    className="t3d-slider"
                    type="range" min={0.1} max={3.0} step={0.1}
                    value={base.animation.speed || 1}
                    onChange={(e) => setAnimation({ speed: parseFloat(e.target.value) })}
                  />
                </div>
              </>
            )}
          </Section>
        )}

      </div>
    </aside>
  );
};

export default Layer3DPanel;
