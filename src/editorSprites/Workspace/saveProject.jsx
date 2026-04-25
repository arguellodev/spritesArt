import React, { useState, useCallback, useRef } from 'react';
import './saveProject.css';

const SaveProject = ({
  frames,
  currentFrame,
  framesResume,
  onProjectLoaded,
  projectMetadata = {},
  className = "",
  loopEnabled = true,
}) => {
  const [projectName, setProjectName] = useState('mi-proyecto');
  const [isLoading, setIsLoading] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [includeCanvas, setIncludeCanvas] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Constantes del formato
  const PROJECT_FORMAT_VERSION = "1.0.0";
  const PROJECT_EXTENSION = "pixelart";

  // ✅ Serializar canvas a base64
  const serializeCanvas = useCallback((canvas, compression = 'medium') => {
    if (!canvas || !canvas.getContext) return null;

    try {
      const quality = {
        'low': 0.3,
        'medium': 0.7,
        'high': 0.9
      }[compression] || 0.7;

      const dataURL = canvas.toDataURL('image/png');
      
      return {
        type: 'dataurl',
        data: dataURL,
        width: canvas.width,
        height: canvas.height,
        compression
      };
    } catch (error) {
      console.warn('Error serializando canvas:', error);
      return null;
    }
  }, []);

  // ✅ Deserializar canvas desde base64
  const deserializeCanvas = useCallback((canvasData) => {
    if (!canvasData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = canvasData.width;
    canvas.height = canvasData.height;
    const ctx = canvas.getContext('2d');

    if (canvasData.type === 'dataurl') {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        };
        img.onerror = () => {
          console.warn('Error cargando imagen');
          resolve(canvas);
        };
        img.src = canvasData.data;
      });
    }

    return canvas;
  }, []);

  // ✅ Serializar proyecto completo
  const serializeProject = useCallback(async () => {
    try {
      const projectData = {
        format: {
          name: "PixelArt Project",
          version: PROJECT_FORMAT_VERSION,
          extension: PROJECT_EXTENSION,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        },
        
        state: {
          currentFrame: currentFrame || 1,
          frameCount: Object.keys(frames || {}).length
        },
        
        framesResume: framesResume ? JSON.parse(JSON.stringify(framesResume)) : null,

        // Configuración de animación — se persiste para restaurar al reabrir.
        animation: { loop: loopEnabled },

        metadata: {
          title: projectName,
          author: projectMetadata.author || "",
          description: additionalNotes || projectMetadata.description || "",
          tags: projectMetadata.tags || [],
          ...projectMetadata
        }
      };

      if (includeCanvas && frames) {
        projectData.canvasData = {};
        
        for (const [frameNumber, frameData] of Object.entries(frames)) {
          if (frameData.canvases) {
            projectData.canvasData[frameNumber] = {};
            
            for (const [layerId, canvas] of Object.entries(frameData.canvases)) {
              if (canvas && canvas.getContext) {
                const canvasData = serializeCanvas(canvas, compressionLevel);
                if (canvasData) {
                  projectData.canvasData[frameNumber][layerId] = canvasData;
                }
              }
            }
          }
        }
      }

      projectData.stats = {
        totalFrames: Object.keys(frames || {}).length,
        hasCanvasData: includeCanvas,
        compression: compressionLevel,
        estimatedSize: JSON.stringify(projectData).length
      };

      return projectData;

    } catch (error) {
      console.error('Error serializando proyecto:', error);
      throw new Error(`Error al preparar el proyecto: ${error.message}`);
    }
  }, [frames, currentFrame, framesResume, projectName, projectMetadata, includeCanvas, compressionLevel, additionalNotes, serializeCanvas, loopEnabled]);

  // ✅ Guardar proyecto
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
      
      console.log(`💾 Proyecto guardado: ${projectName}.${PROJECT_EXTENSION}`);
      
    } catch (error) {
      console.error('Error guardando:', error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [projectName, serializeProject]);

  // ✅ Cargar proyecto
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

      const projectData = JSON.parse(fileContent);

      if (projectData.format?.version !== PROJECT_FORMAT_VERSION) {
        const proceed = confirm(
          `Versión diferente detectada (${projectData.format?.version}). ¿Continuar?`
        );
        if (!proceed) return;
      }

      let restoredFrames = null;
      if (projectData.canvasData && frames) {
        restoredFrames = { ...frames };
        
        for (const [frameNumber, canvasDataByLayer] of Object.entries(projectData.canvasData)) {
          if (restoredFrames[frameNumber]?.canvases) {
            for (const [layerId, canvasData] of Object.entries(canvasDataByLayer)) {
              if (canvasData) {
                const restoredCanvas = await deserializeCanvas(canvasData);
                if (restoredCanvas && restoredFrames[frameNumber].canvases[layerId]) {
                  restoredFrames[frameNumber].canvases[layerId] = restoredCanvas;
                }
              }
            }
          }
        }
      }

      if (onProjectLoaded) {
        onProjectLoaded({
          success: true,
          projectData,
          restoredFrames,
          metadata: projectData.metadata,
          stats: projectData.stats
        });
      }

      if (projectData.metadata?.title) {
        setProjectName(projectData.metadata.title);
      }
      if (projectData.metadata?.description) {
        setAdditionalNotes(projectData.metadata.description);
      }

      console.log(`📁 Proyecto cargado: ${file.name}`);

    } catch (error) {
      console.error('Error cargando proyecto:', error);
      alert(`Error al cargar: ${error.message}`);
      
      if (onProjectLoaded) {
        onProjectLoaded({
          success: false,
          error: error.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [deserializeCanvas, frames, onProjectLoaded]);

  // ✅ Manejar selección de archivo
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      handleLoad(file);
    }
    event.target.value = '';
  }, [handleLoad]);

  // ✅ Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pixelArtFile = files.find(file => 
      file.name.endsWith('.pixelart') || file.name.endsWith('.json')
    );
    
    if (pixelArtFile) {
      handleLoad(pixelArtFile);
    } else {
      alert('Por favor, arrastra un archivo .pixelart o .json válido');
    }
  }, [handleLoad]);

  // ✅ Obtener información del proyecto
  const getProjectInfo = useCallback(() => {
    const frameCount = Object.keys(frames || {}).length;
    const totalLayers = framesResume ? Object.keys(framesResume.layers || {}).length : 0;
    
    return {
      frames: frameCount,
      layers: totalLayers,
      currentFrame: currentFrame || 1,
      hasCanvas: includeCanvas,
      compression: compressionLevel,
      estimatedSizeKB: framesResume ? Math.round(JSON.stringify(framesResume).length / 1024) : 0
    };
  }, [frames, framesResume, currentFrame, includeCanvas, compressionLevel]);

  const projectInfo = getProjectInfo();

  return (
    <div className='save-project-overlay'>
    <div className={`save-project`}>
      {/* Header */}
      <div className="save-project__header">
        <div className="save-project__title">
          <span className="save-project__icon">💾</span>
          Gestor de Proyectos
        </div>
        <div className="save-project__stats">
          <span className="stat">
            <span className="stat__icon">🎬</span>
            {projectInfo.frames} frames
          </span>
          <span className="stat">
            <span className="stat__icon">🎨</span>
            {projectInfo.layers} capas
          </span>
          <span className="stat">
            <span className="stat__icon">📍</span>
            Frame {projectInfo.currentFrame}
          </span>
          <span className="stat">
            <span className="stat__icon">📊</span>
            ~{projectInfo.estimatedSizeKB} KB
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="save-project__form">
        {/* Nombre del proyecto */}
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

        {/* Opciones básicas */}
        <div className="form-group">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={includeCanvas}
                onChange={(e) => setIncludeCanvas(e.target.checked)}
                disabled={isLoading}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                <span className="checkbox-title">Incluir contenido visual</span>
                <span className="checkbox-subtitle">Guarda las imágenes dibujadas</span>
              </span>
            </label>
          </div>
          
          {includeCanvas && (
            <div className="compression-selector">
              <label className="form-label form-label--small">
                <span className="form-label__icon">🗜️</span>
                Nivel de compresión
              </label>
              <div className="radio-group">
                {[
                  { value: 'low', label: 'Baja', subtitle: 'Mayor calidad, más tamaño' },
                  { value: 'medium', label: 'Media', subtitle: 'Balance óptimo' },
                  { value: 'high', label: 'Alta', subtitle: 'Menor tamaño, comprimido' }
                ].map(option => (
                  <label key={option.value} className="radio-label">
                    <input 
                      type="radio"
                      name="compression"
                      value={option.value}
                      checked={compressionLevel === option.value}
                      onChange={(e) => setCompressionLevel(e.target.value)}
                      disabled={isLoading}
                      className="radio-input"
                    />
                    <span className="radio-custom"></span>
                    <span className="radio-text">
                      <span className="radio-title">{option.label}</span>
                      <span className="radio-subtitle">{option.subtitle}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones principales */}
      <div className="save-project__actions">
        <button 
          onClick={handleSave}
          disabled={isLoading || !projectName.trim()}
          className="btn btn--primary btn--save"
        >
          <span className="btn__icon">💾</span>
          <span className="btn__text">
            {isLoading ? 'Guardando...' : 'Guardar Proyecto'}
          </span>
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
                <span className="info-item__label">Canvas</span>
                <span className="info-item__value">{includeCanvas ? 'Incluido' : 'Solo estructura'}</span>
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

      {/* Zona de drag & drop */}
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
            <div className="drop-zone__subtitle">Archivos .pixelart o .json</div>
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
                alert('📋 Proyecto copiado al portapapeles');
              } else {
                const textArea = document.createElement('textarea');
                textArea.value = jsonString;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('📋 Proyecto copiado al portapapeles');
              }
            } catch (error) {
              alert(`Error: ${error.message}`);
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
            if (input) {
              try {
                const projectData = JSON.parse(input);
                
                if (onProjectLoaded) {
                  onProjectLoaded({
                    success: true,
                    projectData,
                    restoredFrames: null,
                    metadata: projectData.metadata,
                    stats: projectData.stats
                  });
                }
                
                if (projectData.metadata?.title) {
                  setProjectName(projectData.metadata.title);
                }
                if (projectData.metadata?.description) {
                  setAdditionalNotes(projectData.metadata.description);
                }
                
                alert('📋 Proyecto cargado desde portapapeles');
              } catch (error) {
                alert('❌ JSON inválido');
              }
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
            alert(`📊 Información del proyecto:\n\n• Frames: ${info.frames}\n• Capas: ${info.layers}\n• Frame actual: ${info.currentFrame}\n• Tamaño: ~${info.estimatedSizeKB} KB\n• Canvas incluido: ${info.hasCanvas ? 'Sí' : 'No'}\n• Compresión: ${info.compression}`);
          }}
          className="btn btn--small btn--ghost"
          title="Ver información del proyecto"
        >
          <span className="btn__icon">📊</span>
          <span className="btn__text">Info</span>
        </button>
      </div>

      {/* Input file oculto */}
      <input 
        ref={fileInputRef}
        type="file"
        accept={`.${PROJECT_EXTENSION},.json`}
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
        <span className="footer-text">
          💾 PixelArt Project Manager v{PROJECT_FORMAT_VERSION}
        </span>
        <span className="footer-formats">
          Formatos: .pixelart, .json
        </span>
      </div>
    </div>
    </div>
  );
};

export default SaveProject;