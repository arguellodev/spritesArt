import React, { useState, useEffect } from 'react';
import './initializeProject.css';
import { FaPaintbrush } from "react-icons/fa6";
import { LuFolderOpen, LuFileSearch2, LuClock } from "react-icons/lu";

const InitializeProject = ({ onComplete, setLoadedData }) => {
  const [projectName, setProjectName] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(null);
  const [customWidth, setCustomWidth] = useState(64);
  const [customHeight, setCustomHeight] = useState(64);
  const [isCustom, setIsCustom] = useState(false);
  const [completeInitialize, setCompleteInitialize] = useState(false);

  const [recentProjects, setRecentProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [defaultDirectoryHandle, setDefaultDirectoryHandle] = useState(null);

  const DEFAULT_FOLDER_NAME = "MisProyectosPixelArt";
  const supportsFileSystemAccess = 'showDirectoryPicker' in window;

  const sizePresets = [
    { name: 'Minúsculo',     width: 16,   height: 16,   description: 'Iconos de juegos' },
    { name: 'Pequeño',       width: 32,   height: 32,   description: 'Sprites retro clásicos' },
    { name: 'Mediano',       width: 64,   height: 64,   description: 'Personajes estándar' },
    { name: 'Grande',        width: 128,  height: 128,  description: 'Personajes detallados' },
    { name: 'Gigante',       width: 512,  height: 512,  description: 'Escenarios' },
    { name: 'Ultra',         width: 2048, height: 2048, description: 'Escenarios gigantes' },
    { name: 'Personalizado', width: 64,   height: 64,   description: 'Define tu tamaño' },
  ];

  const getDimensions = (data) => ({
    width:  data?.dimensions?.width  ?? data?.width  ?? 64,
    height: data?.dimensions?.height ?? data?.height ?? 64,
  });

  const handleSelectFolder = async () => {
    if (!supportsFileSystemAccess) {
      alert('Tu navegador no soporta selección de carpetas. Usa Chrome, Edge u Opera.');
      return;
    }
    try {
      setIsLoadingProjects(true);
      const directoryHandle = await window.showDirectoryPicker({ mode: 'read', startIn: 'documents' });
      setDefaultDirectoryHandle(directoryHandle);
      localStorage.setItem('defaultProjectFolder', directoryHandle.name);
      await loadProjectsFromDirectory(directoryHandle);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error al seleccionar carpeta:', error);
        alert('Error al acceder a la carpeta seleccionada');
      }
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadProjectsFromDirectory = async (directoryHandle) => {
    const projects = [];
    try {
      for await (const [name, fileHandle] of directoryHandle.entries()) {
        if (fileHandle.kind === 'file' && (name.endsWith('.pixproj') || name.endsWith('.json'))) {
          try {
            const file = await fileHandle.getFile();
            const content = await file.text();
            let projectData = null;
            let dimensions = 'Sin datos';
            try {
              projectData = JSON.parse(content);
              const dim = getDimensions(projectData);
              dimensions = `${dim.width}×${dim.height}`;
            } catch (parseError) {
              console.warn(`No se pudo parsear ${name}:`, parseError);
            }
            projects.push({
              name: name.replace(/\.[^/.]+$/, ""),
              path: name,
              lastModified: file.lastModified,
              size: file.size,
              dimensions,
              data: projectData,
              fileHandle,
              id: Date.now() + Math.random()
            });
          } catch (fileError) {
            console.warn(`Error leyendo archivo ${name}:`, fileError);
          }
        }
      }
      projects.sort((a, b) => b.lastModified - a.lastModified);
      setRecentProjects(projects);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
      alert('Error al cargar proyectos de la carpeta');
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    setIsLoadingProjects(true);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target.result);
          if (setLoadedData && typeof setLoadedData === 'function') {
            setLoadedData(projectData);
          }
          handleProjectSelect({
            name: file.name.replace(/\.[^/.]+$/, ""),
            path: file.name,
            lastModified: file.lastModified,
            dimensions: `${getDimensions(projectData).width}×${getDimensions(projectData).height}`,
            data: projectData
          });
        } catch (error) {
          console.error('Error al cargar el proyecto:', error);
          alert(`Error al cargar ${file.name}: archivo corrupto o formato inválido`);
        }
      };
      reader.readAsText(file);
    });
    setIsLoadingProjects(false);
  };

  const handleProjectSelect = async (project) => {
    try {
      let projectData = project.data;
      if (!projectData && project.fileHandle) {
        setIsLoadingProjects(true);
        const file = await project.fileHandle.getFile();
        projectData = JSON.parse(await file.text());
      }
      if (projectData) {
        if (setLoadedData && typeof setLoadedData === 'function') {
          setLoadedData(projectData);
        }
        const { width, height } = getDimensions(projectData);
        onComplete({ name: project.name, width, height, projectData });
      } else {
        setRecentProjects(prev => {
          const filtered = prev.filter(p => p.path !== project.path);
          return [{ ...project, id: Date.now() + Math.random() }, ...filtered].slice(0, 15);
        });
      }
    } catch (error) {
      console.error('Error al abrir proyecto:', error);
      alert(`Error al abrir ${project.name}: ${error.message}`);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const diffDays = Math.ceil(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} sem.`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePresetSelect = (preset, index) => {
    setSelectedPresetIndex(index);
    setIsCustom(preset.name === 'Personalizado');
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
  };

  const handleStart = () => {
    if (selectedPresetIndex === null) return;
    const selectedPreset = sizePresets[selectedPresetIndex];
    const finalName = projectName.trim() || 'Untitled';
    const finalWidth = isCustom ? customWidth : selectedPreset.width;
    const finalHeight = isCustom ? customHeight : selectedPreset.height;
    setCompleteInitialize(true);
    setTimeout(() => onComplete({ name: finalName, width: finalWidth, height: finalHeight }), 500);
  };

  const isValidSetup = () => {
    if (selectedPresetIndex === null) return false;
    if (isCustom) return customWidth > 0 && customHeight > 0;
    return true;
  };

  useEffect(() => {
    const savedProjects = localStorage.getItem('recentPixelProjects');
    if (savedProjects) {
      try { setRecentProjects(JSON.parse(savedProjects)); } catch (e) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (recentProjects.length > 0) {
      localStorage.setItem('recentPixelProjects', JSON.stringify(
        recentProjects.map(p => ({ ...p, fileHandle: undefined }))
      ));
    }
  }, [recentProjects]);

  const PixelGridIcon = ({ selected }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" fill={selected ? "rgba(140,82,255,0.22)" : "rgba(140,82,255,0.09)"} rx="4"/>
      <line x1="8.5" y1="1" x2="8.5" y2="25" stroke="rgba(140,82,255,0.35)" strokeWidth="0.7"/>
      <line x1="17.5" y1="1" x2="17.5" y2="25" stroke="rgba(140,82,255,0.35)" strokeWidth="0.7"/>
      <line x1="1" y1="8.5" x2="25" y2="8.5" stroke="rgba(140,82,255,0.35)" strokeWidth="0.7"/>
      <line x1="1" y1="17.5" x2="25" y2="17.5" stroke="rgba(140,82,255,0.35)" strokeWidth="0.7"/>
      <rect x="2" y="2" width="5.5" height="5.5" fill={selected ? "rgba(140,82,255,0.7)" : "rgba(140,82,255,0.35)"} rx="1"/>
      <rect x="10" y="10" width="6" height="6" fill={selected ? "rgba(140,82,255,0.55)" : "rgba(140,82,255,0.25)"} rx="1"/>
      <rect x="18.5" y="18.5" width="5.5" height="5.5" fill={selected ? "rgba(140,82,255,0.7)" : "rgba(140,82,255,0.35)"} rx="1"/>
    </svg>
  );

  const NoPreviewIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="1" width="7" height="7" fill="rgba(140,82,255,0.5)" rx="1"/>
      <rect x="9" y="1" width="5" height="5" fill="rgba(140,82,255,0.3)" rx="1"/>
      <rect x="1" y="9" width="5" height="5" fill="rgba(140,82,255,0.3)" rx="1"/>
      <rect x="9" y="9" width="7" height="7" fill="rgba(140,82,255,0.6)" rx="1"/>
      <rect x="15" y="1" width="4" height="4" fill="rgba(140,82,255,0.2)" rx="1"/>
      <rect x="15" y="9" width="4" height="4" fill="rgba(140,82,255,0.4)" rx="1"/>
      <rect x="1" y="15" width="4" height="4" fill="rgba(140,82,255,0.4)" rx="1"/>
      <rect x="9" y="15" width="4" height="4" fill="rgba(140,82,255,0.2)" rx="1"/>
      <rect x="15" y="15" width="4" height="4" fill="rgba(140,82,255,0.5)" rx="1"/>
    </svg>
  );

  const EmptyStateIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="2"  y="2"  width="10" height="10" fill="rgba(140,82,255,0.15)" rx="2"/>
      <rect x="15" y="2"  width="10" height="10" fill="rgba(140,82,255,0.1)"  rx="2"/>
      <rect x="28" y="2"  width="10" height="10" fill="rgba(140,82,255,0.07)" rx="2"/>
      <rect x="2"  y="15" width="10" height="10" fill="rgba(140,82,255,0.1)"  rx="2"/>
      <rect x="15" y="15" width="10" height="10" fill="rgba(140,82,255,0.2)"  rx="2"/>
      <rect x="28" y="15" width="10" height="10" fill="rgba(140,82,255,0.07)" rx="2"/>
      <rect x="2"  y="28" width="10" height="10" fill="rgba(140,82,255,0.07)" rx="2"/>
      <rect x="15" y="28" width="10" height="10" fill="rgba(140,82,255,0.1)"  rx="2"/>
      <rect x="28" y="28" width="10" height="10" fill="rgba(140,82,255,0.15)" rx="2"/>
    </svg>
  );

  return (
    <div className={`initialize-overlay ${completeInitialize ? 'completing' : ''}`}>
      <div className="initialize-container">

        {/* ── Panel Izquierdo: Marca + Recientes ── */}
        <div className="init-left-panel">

          <div className="init-brand">
            <img src="pixcalli-serpiente.svg" className="init-logo" alt="PixCalli" />
            <div>
              <h1 className="app-title">PixCalli Studio</h1>
              <p className="app-subtitle">Editor de Sprites · Pixel Art</p>
            </div>
          </div>

          <div className="init-recent">
            <div className="init-section-header">
              <span className="init-section-title">
                <LuClock size={11} />
                Recientes
                {recentProjects.length > 0 && (
                  <span className="project-count">{recentProjects.length}</span>
                )}
              </span>
              <div className="folder-buttons">
                {supportsFileSystemAccess && (
                  <button
                    className="browse-folder-btn"
                    onClick={handleSelectFolder}
                    title="Seleccionar carpeta de proyectos"
                  >
                    <LuFolderOpen size={12} />
                    Carpeta
                  </button>
                )}
                <button
                  className="browse-files-btn"
                  onClick={() => document.getElementById('file-input').click()}
                  title="Seleccionar archivo de proyecto"
                >
                  <LuFileSearch2 size={12} />
                  Archivo
                </button>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".pixproj,.json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                multiple
              />
            </div>

            <div className="projects-list">
              {isLoadingProjects ? (
                <div className="loading-projects">
                  <div className="loading-spinner" />
                  <span>Cargando proyectos...</span>
                </div>
              ) : recentProjects.length > 0 ? (
                recentProjects.map((project, index) => (
                  <div
                    key={project.id || index}
                    className="project-item"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="project-preview">
                      {project.thumbnail ? (
                        <img src={project.thumbnail} alt={project.name} className="project-thumbnail" />
                      ) : (
                        <div className="no-preview"><NoPreviewIcon /></div>
                      )}
                    </div>
                    <div className="project-info">
                      <h4 className="project-name">{project.name}</h4>
                      <p className="project-path">
                        {project.path}
                        {project.size && <span className="file-size"> · {formatFileSize(project.size)}</span>}
                      </p>
                    </div>
                    <div className="project-meta">
                      <span className="project-size">{project.dimensions}</span>
                      <span className="project-date">{formatDate(project.lastModified)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-projects">
                  <EmptyStateIcon />
                  <p>Sin proyectos recientes</p>
                  <span>
                    {supportsFileSystemAccess
                      ? 'Abre una carpeta o archivo para comenzar'
                      : 'Usa "Archivo" para cargar un proyecto'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="init-left-footer">
            <div className="powered-by">
              <span>Powered by</span>
              <div className="company-logo">
                <div className="logo-icon">
                  <img src="./arganion.svg" alt="Argánion" />
                </div>
                <span className="company-name">Argánion</span>
              </div>
            </div>
            <span className="version">Pre alpha 1.0.0</span>
          </div>
        </div>

        {/* ── Panel Derecho: Nuevo Proyecto ── */}
        <div className="init-right-panel">
          <div className="init-new-project">

            <div className="init-new-header">
              <h2 className="init-panel-title">Nuevo Proyecto</h2>
              <p className="init-panel-subtitle">Configura el lienzo para comenzar a crear</p>
            </div>

            <div className="init-field">
              <label htmlFor="project-name">Nombre del proyecto</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Untitled"
                className="project-name-input"
              />
            </div>

            <div className="init-field">
              <label>Tamaño del lienzo</label>
              <div className="presets-grid">
                {sizePresets.map((preset, index) => (
                  <div
                    key={index}
                    className={`preset-card ${selectedPresetIndex === index ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(preset, index)}
                  >
                    <div className="preset-icon">
                      <PixelGridIcon selected={selectedPresetIndex === index} />
                    </div>
                    <div className="preset-info">
                      <span className="preset-name">{preset.name}</span>
                      <span className="preset-size">{preset.width} × {preset.height}</span>
                      <span className="preset-description">{preset.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isCustom && (
              <div className="custom-dimensions">
                <div className="dimension-inputs">
                  <div className="dimension-input">
                    <label htmlFor="custom-width">Ancho</label>
                    <div className="dimension-input-wrap">
                      <input
                        id="custom-width"
                        type="number"
                        min="1"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1)}
                      />
                      <span className="input-unit">px</span>
                    </div>
                  </div>
                  <div className="dimension-separator">×</div>
                  <div className="dimension-input">
                    <label htmlFor="custom-height">Alto</label>
                    <div className="dimension-input-wrap">
                      <input
                        id="custom-height"
                        type="number"
                        min="1"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1)}
                      />
                      <span className="input-unit">px</span>
                    </div>
                  </div>
                </div>
                <p className="custom-hint">Sin límite de tamaño · Valores muy altos pueden afectar el rendimiento</p>
              </div>
            )}

            <button
              className={`start-button ${isValidSetup() ? 'ready' : 'disabled'}`}
              onClick={handleStart}
              disabled={!isValidSetup()}
            >
              {completeInitialize ? (
                <span className="loading">
                  <div className="spinner" />
                  Creando proyecto...
                </span>
              ) : (
                <>
                  <FaPaintbrush size={14} />
                  Crear Proyecto
                </>
              )}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default InitializeProject;
