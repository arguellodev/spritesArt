import React, { useState, useCallback, useRef } from 'react';
import './saveProject.css';

// ============================================================
// Formato v2.1.0 — guarda TODO el estado del proyecto:
//   canvases, framesResume, layers, onionSkin, viewport, paleta
// Compatible con v1.0.0 y v2.0.0 mediante migradores.
//
// Cambios v2.0.0 → v2.1.0:
//   - framesResume.extensions.threeDLayers añadido (capas 3D).
//   - layer.type opcional ('paint' | '3d', default 'paint').
//   - El parser viejo ignora extensions.threeDLayers (forward-compat). Las
//     capas 3D abiertas en versiones <2.1.0 se ven como capas vacías o con
//     su último canvas pre-renderizado.
// ============================================================

const PROJECT_FORMAT_VERSION = '2.1.0';
const PROJECT_EXTENSION = 'pixcalli';
const LEGACY_EXTENSION = 'pixelart';

// ---- Migrador v1 → v2 ----
function migrateV1toV2(data) {
  return {
    format: {
      name: 'PixCalli Studio',
      version: PROJECT_FORMAT_VERSION,
      extension: PROJECT_EXTENSION,
      created: data.format?.created ?? new Date().toISOString(),
      lastModified: new Date().toISOString(),
      migratedFrom: data.format?.version ?? '1.0.0',
    },
    metadata: data.metadata ?? {},
    viewport: {
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      activeLayerId: null,
      currentFrame: data.state?.currentFrame ?? 1,
    },
    animation: {
      defaultFrameDuration: data.framesResume?.metadata?.defaultFrameDuration ?? 100,
      frameRate: data.framesResume?.metadata?.frameRate ?? 10,
      loop: true,
    },
    framesResume: data.framesResume ?? null,
    layers: [],
    canvases: data.canvasData
      ? _flattenLegacyCanvases(data.canvasData)
      : {},
    palette: {
      foreground: { r: 0, g: 0, b: 0, a: 255 },
      background: { r: 255, g: 255, b: 255, a: 255 },
      fillColor: { r: 0, g: 0, b: 0, a: 255 },
      borderColor: { r: 0, g: 0, b: 0, a: 255 },
      recentColors: [],
    },
    onionSkin: {
      enabled: false,
      settings: {
        previousOpacity: 0.3,
        nextOpacity: 0.3,
        previousMatiz: null,
        nextMatiz: null,
      },
      framesConfig: null,
    },
  };
}

// v1 guardaba canvasData[frameNumber][layerId]; v2 usa clave plana frame_N_layerId
function _flattenLegacyCanvases(canvasData) {
  const flat = {};
  for (const [frameNumber, layerMap] of Object.entries(canvasData)) {
    for (const [layerId, data] of Object.entries(layerMap)) {
      flat[`frame_${frameNumber}_${layerId}`] = data;
    }
  }
  return flat;
}

// ---- Componente principal ----
const SaveProject = ({
  // datos del editor
  frames,
  currentFrame,
  framesResume,
  layers,
  zoom,
  panOffset,
  activeLayerId,
  toolParameters,
  recentColors,
  onionSkinSettings,
  onionFramesConfig,
  onionSkinEnabled,
  // extensiones aditivas (opcionales)
  customPalettes,
  animationTags,
  slices,
  tilesets,
  referenceLayerMeta,
  guides,
  // callbacks
  onProjectLoaded,
  onClose,
  projectMetadata = {},
  canvasWidth,
  canvasHeight,
  // toggle de bucle del reproductor — se persiste para restaurar al reabrir.
  loopEnabled = true,
}) => {
  const [projectName, setProjectName] = useState('mi-proyecto');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ---- Serialización de canvas ----
  const serializeCanvas = useCallback((canvas) => {
    if (!canvas || !canvas.getContext) return null;
    try {
      return {
        type: 'dataurl',
        data: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      };
    } catch (err) {
      console.warn('Error serializando canvas:', err);
      return null;
    }
  }, []);

  // ---- Deserialización de canvas ----
  const deserializeCanvas = useCallback((canvasData) => {
    if (!canvasData) return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvasData.width;
    canvas.height = canvasData.height;
    const ctx = canvas.getContext('2d');

    if (canvasData.type === 'dataurl') {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0); resolve(canvas); };
        img.onerror = () => resolve(canvas);
        img.src = canvasData.data;
      });
    }
    return Promise.resolve(canvas);
  }, []);

  // ---- Serialización completa v2 ----
  const serializeProject = useCallback(async () => {
    const now = new Date().toISOString();

    // Canvases: clave plana frame_N_layerId
    const canvases = {};
    if (frames) {
      for (const [frameNumber, frameData] of Object.entries(frames)) {
        if (frameData?.canvases) {
          for (const [layerId, canvas] of Object.entries(frameData.canvases)) {
            if (canvas?.getContext) {
              const serialized = serializeCanvas(canvas);
              if (serialized) {
                canvases[`frame_${frameNumber}_${layerId}`] = serialized;
              }
            }
          }
        }
      }
    }

    // Capas: serializar solo los datos (no el canvas DOM)
    const serializedLayers = (layers ?? []).map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      zIndex: layer.zIndex,
      isGroupLayer: layer.isGroupLayer ?? false,
      parentLayerId: layer.parentLayerId ?? null,
      blendMode: layer.blendMode ?? 'normal',
    }));

    const projectData = {
      format: {
        name: 'PixCalli Studio',
        version: PROJECT_FORMAT_VERSION,
        extension: PROJECT_EXTENSION,
        created: now,
        lastModified: now,
      },
      metadata: {
        title: projectName,
        author: projectMetadata.author ?? '',
        description: additionalNotes || projectMetadata.description || '',
        tags: projectMetadata.tags ?? [],
      },
      viewport: {
        zoom: zoom ?? 1,
        panOffset: panOffset ?? { x: 0, y: 0 },
        activeLayerId: activeLayerId ?? null,
        currentFrame: currentFrame ?? 1,
      },
      animation: {
        defaultFrameDuration: framesResume?.metadata?.defaultFrameDuration ?? 100,
        frameRate: framesResume?.metadata?.frameRate ?? 10,
        loop: loopEnabled,
      },
      framesResume: framesResume ? JSON.parse(JSON.stringify(framesResume)) : null,
      layers: serializedLayers,
      canvases,
      palette: {
        foreground: toolParameters?.foregroundColor ?? { r: 0, g: 0, b: 0, a: 255 },
        background: toolParameters?.backgroundColor ?? { r: 255, g: 255, b: 255, a: 255 },
        fillColor: toolParameters?.fillColor ?? { r: 0, g: 0, b: 0, a: 255 },
        borderColor: toolParameters?.borderColor ?? { r: 0, g: 0, b: 0, a: 255 },
        recentColors: recentColors ?? [],
      },
      onionSkin: {
        enabled: onionSkinEnabled ?? false,
        settings: onionSkinSettings ?? null,
        framesConfig: onionFramesConfig ?? null,
      },
      dimensions: {
        width: canvasWidth,
        height: canvasHeight,
      },
      // --- Extensiones v2.1 (aditivas; parsers viejos las ignoran) ---
      extensions: {
        customPalettes: customPalettes ?? [],
        animationTags: animationTags ?? [],
        slices: slices ?? [],
        // Los referenceLayers pueden traer un canvas grande: si el consumidor
        // no pasó `referenceLayerMeta` como serializable, lo omitimos.
        referenceLayers: Array.isArray(referenceLayerMeta) ? referenceLayerMeta : [],
        // Los tilesets pueden pasarse preserializados (dataURL por tile) o null.
        tilesets: tilesets ?? null,
        guides: guides ?? [],
      },
    };

    return projectData;
  }, [
    frames, framesResume, layers, zoom, panOffset, activeLayerId,
    currentFrame, toolParameters, recentColors,
    onionSkinSettings, onionFramesConfig, onionSkinEnabled,
    projectName, additionalNotes, projectMetadata, serializeCanvas,
    customPalettes, animationTags, slices, tilesets, referenceLayerMeta, guides,
    canvasWidth, canvasHeight, loopEnabled,
  ]);

  // ---- Guardar ----
  const handleSave = useCallback(async () => {
    if (!projectName.trim()) {
      alert('Por favor, ingresa un nombre para el proyecto');
      return;
    }
    setIsLoading(true);
    try {
      const projectData = await serializeProject();
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}.${PROJECT_EXTENSION}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(`Proyecto guardado: ${projectName}.${PROJECT_EXTENSION}`);
    } catch (err) {
      console.error('Error guardando:', err);
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [projectName, serializeProject]);

  // ---- Carga y restauración ----
  const handleLoad = useCallback(async (file) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      let projectData = JSON.parse(fileContent);

      // Migrar formato antiguo
      const version = projectData.format?.version;
      if (version === '1.0.0') {
        console.log('Migrando proyecto v1 → v2...');
        projectData = migrateV1toV2(projectData);
      } else if (version !== PROJECT_FORMAT_VERSION) {
        const proceed = confirm(
          `Versión de archivo desconocida (${version}). Se intentará cargar igual. ¿Continuar?`
        );
        if (!proceed) { setIsLoading(false); return; }
      }

      // Restaurar canvases a objetos canvas DOM
      const restoredCanvases = {};
      if (projectData.canvases) {
        const promises = Object.entries(projectData.canvases).map(async ([key, data]) => {
          const canvas = await deserializeCanvas(data);
          if (canvas) restoredCanvases[key] = canvas;
        });
        await Promise.all(promises);
      }

      if (onProjectLoaded) {
        onProjectLoaded({
          success: true,
          projectData,
          restoredCanvases,
          metadata: projectData.metadata,
        });
      }

      if (projectData.metadata?.title) setProjectName(projectData.metadata.title);
      if (projectData.metadata?.description) setAdditionalNotes(projectData.metadata.description);

      console.log(`Proyecto cargado: ${file.name}`);
    } catch (err) {
      console.error('Error cargando proyecto:', err);
      alert(`Error al cargar: ${err.message}`);
      if (onProjectLoaded) onProjectLoaded({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [deserializeCanvas, onProjectLoaded]);

  // ---- Handlers de UI ----
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleLoad(file);
    e.target.value = '';
  }, [handleLoad]);

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }, []);
  const handleDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    const valid = files.find(f =>
      f.name.endsWith(`.${PROJECT_EXTENSION}`) ||
      f.name.endsWith(`.${LEGACY_EXTENSION}`) ||
      f.name.endsWith('.json')
    );
    if (valid) handleLoad(valid);
    else alert(`Arrastra un archivo .${PROJECT_EXTENSION} o .${LEGACY_EXTENSION}`);
  }, [handleLoad]);

  const getProjectInfo = useCallback(() => ({
    frames: Object.keys(frames ?? {}).length,
    layers: (layers ?? []).length,
    currentFrame: currentFrame ?? 1,
    estimatedSizeKB: framesResume
      ? Math.round(JSON.stringify(framesResume).length / 1024)
      : 0,
  }), [frames, layers, framesResume, currentFrame]);

  const projectInfo = getProjectInfo();

  return (
    <div className='save-project-overlay' onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
    <div className={`save-project`}>
      {/* Header */}
      <div className="save-project__header">
        <div className="save-project__title">
          <span className="save-project__icon">💾</span>
          Gestor de Proyectos
        </div>
        <div className="save-project__stats">
          <span className="stat"><span className="stat__icon">🎬</span>{projectInfo.frames} frames</span>
          <span className="stat"><span className="stat__icon">🎨</span>{projectInfo.layers} capas</span>
          <span className="stat"><span className="stat__icon">📍</span>Frame {projectInfo.currentFrame}</span>
          <span className="stat"><span className="stat__icon">📊</span>~{projectInfo.estimatedSizeKB} KB</span>
        </div>
        {onClose && (
          <button className="save-project__close" onClick={onClose} title="Cerrar">✕</button>
        )}
      </div>

      {/* Form */}
      <div className="save-project__form">
        <div className="form-group">
          <label className="form-label">
            <span className="form-label__icon">📝</span>
            Nombre del proyecto
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="mi-proyecto-genial"
            disabled={isLoading}
            className="form-input"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="save-project__actions">
        <button
          onClick={handleSave}
          disabled={isLoading || !projectName.trim()}
          className="btn btn--primary btn--save"
        >
          <span className="btn__icon">💾</span>
          <span className="btn__text">{isLoading ? 'Guardando...' : 'Guardar Proyecto'}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="btn btn--secondary btn--load"
        >
          <span className="btn__icon">📁</span>
          <span className="btn__text">Cargar Proyecto</span>
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`btn btn--outline btn--toggle ${showAdvanced ? 'btn--toggle--active' : ''}`}
        >
          <span className="btn__icon">⚙️</span>
          <span className="btn__text">Avanzado</span>
        </button>
      </div>

      {/* Opciones avanzadas */}
      <div className={`advanced-options ${showAdvanced ? 'advanced-options--open' : ''}`}>
        <div className="advanced-options__content">
          <div className="advanced-options__header">
            <span className="advanced-options__icon">⚙️</span>
            Configuración Avanzada
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label__icon">📝</span>
              Notas del proyecto
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Descripción, notas, instrucciones..."
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="project-info">
            <div className="project-info__header">Información Técnica</div>
            <div className="project-info__grid">
              <div className="info-item">
                <span className="info-item__icon">🔧</span>
                <span className="info-item__label">Formato</span>
                <span className="info-item__value">.{PROJECT_EXTENSION}</span>
              </div>
              <div className="info-item">
                <span className="info-item__icon">📦</span>
                <span className="info-item__label">Versión</span>
                <span className="info-item__value">{PROJECT_FORMAT_VERSION}</span>
              </div>
              <div className="info-item">
                <span className="info-item__icon">🎨</span>
                <span className="info-item__label">Capas</span>
                <span className="info-item__value">{projectInfo.layers}</span>
              </div>
              <div className="info-item">
                <span className="info-item__icon">⏰</span>
                <span className="info-item__label">Modificado</span>
                <span className="info-item__value">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zona drag & drop */}
      <div
        className={`drop-zone ${dragActive ? 'drop-zone--active' : ''}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-zone__content">
          <div className="drop-zone__icon">📁</div>
          <div className="drop-zone__text">
            <div className="drop-zone__title">Arrastra un archivo aquí</div>
            <div className="drop-zone__subtitle">Archivos .{PROJECT_EXTENSION} o .{LEGACY_EXTENSION}</div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="quick-actions">
        <button
          onClick={async () => {
            try {
              const projectData = await serializeProject();
              const jsonString = JSON.stringify(projectData, null, 2);
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(jsonString);
              } else {
                const ta = document.createElement('textarea');
                ta.value = jsonString;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }
              alert('Proyecto copiado al portapapeles');
            } catch (err) {
              alert(`Error: ${err.message}`);
            }
          }}
          disabled={isLoading}
          className="btn btn--small btn--ghost"
          title="Copiar proyecto como JSON"
        >
          <span className="btn__icon">📋</span>
          <span className="btn__text">Copiar</span>
        </button>

        <button
          onClick={() => {
            const input = prompt('Pega el JSON del proyecto aquí:');
            if (!input) return;
            try {
              let projectData = JSON.parse(input);
              if (projectData.format?.version === '1.0.0') {
                projectData = migrateV1toV2(projectData);
              }
              if (onProjectLoaded) {
                onProjectLoaded({ success: true, projectData, restoredCanvases: {}, metadata: projectData.metadata });
              }
              if (projectData.metadata?.title) setProjectName(projectData.metadata.title);
              alert('Proyecto cargado desde portapapeles');
            } catch {
              alert('JSON inválido');
            }
          }}
          disabled={isLoading}
          className="btn btn--small btn--ghost"
          title="Cargar proyecto desde JSON"
        >
          <span className="btn__icon">📋</span>
          <span className="btn__text">Pegar</span>
        </button>

        <button
          onClick={() => {
            const info = getProjectInfo();
            alert(
              `Información del proyecto:\n\n` +
              `Frames: ${info.frames}\n` +
              `Capas: ${info.layers}\n` +
              `Frame actual: ${info.currentFrame}\n` +
              `Tamaño estimado: ~${info.estimatedSizeKB} KB\n` +
              `Formato: v${PROJECT_FORMAT_VERSION}`
            );
          }}
          className="btn btn--small btn--ghost"
          title="Ver información del proyecto"
        >
          <span className="btn__icon">📊</span>
          <span className="btn__text">Info</span>
        </button>
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={`.${PROJECT_EXTENSION},.${LEGACY_EXTENSION},.json`}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">Procesando proyecto...</div>
            <div className="loading-bar">
              <div className="loading-bar__fill"></div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="save-project__footer">
        <span className="footer-text">PixCalli Studio — Gestor de Proyectos v{PROJECT_FORMAT_VERSION}</span>
        <span className="footer-formats">Formatos: .{PROJECT_EXTENSION}, .{LEGACY_EXTENSION}</span>
      </div>
    </div>
    </div>
  );
};

export default SaveProject;
