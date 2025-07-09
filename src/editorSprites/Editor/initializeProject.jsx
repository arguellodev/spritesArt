import React, { useState, useEffect } from 'react';
import './initializeProject.css';
import { FaPaintbrush } from "react-icons/fa6";

const InitializeProject = ({ onComplete, setLoadedData }) => {
  const [projectName, setProjectName] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(null);
  const [customWidth, setCustomWidth] = useState(64);
  const [customHeight, setCustomHeight] = useState(64);
  const [isCustom, setIsCustom] = useState(false);
  const [completeInitialize, setCompleteInitialize] = useState(false);

  // Estados para proyectos y carpetas
  const [recentProjects, setRecentProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [defaultDirectoryHandle, setDefaultDirectoryHandle] = useState(null);

  // 📁 CONFIGURACIÓN DE CARPETA PREDEFINIDA
  // Puedes cambiar este nombre por el que prefieras
  const DEFAULT_FOLDER_NAME = "MisProyectosPixelArt";

  // Detectar si el navegador soporta File System Access API
  const supportsFileSystemAccess = 'showDirectoryPicker' in window;

  // Presets populares para sprites y pixel art
  const sizePresets = [
    { name: 'Sprite Minúsculo', width: 16, height: 16, description: 'Perfecto para iconos de juegos' },
    { name: 'Sprite Pequeño', width: 32, height: 32, description: 'Sprites clásicos retro' },
    { name: 'Sprite Mediano', width: 64, height: 64, description: 'Tamaño estándar para personajes' },
    { name: 'Sprite Grande', width: 128, height: 128, description: 'Tamaño estándar para personajes' },
    { name: 'Personalizado', width: 0, height: 0, description: 'Define tus propias dimensiones' }
  ];
  

  // Función para manejar selección de carpeta (File System Access API)
  const handleSelectFolder = async () => {
    if (!supportsFileSystemAccess) {
      alert('Tu navegador no soporta selección de carpetas. Usa Chrome, Edge u Opera.');
      return;
    }

    try {
      setIsLoadingProjects(true);
      
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'documents' // Inicia en la carpeta Documentos
      });

      // Guardar el handle de la carpeta para uso futuro
      setDefaultDirectoryHandle(directoryHandle);
      
      // Guardar en localStorage para recordar la carpeta
      localStorage.setItem('defaultProjectFolder', directoryHandle.name);

      // Cargar proyectos de la carpeta seleccionada
      await loadProjectsFromDirectory(directoryHandle);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Usuario canceló la selección de carpeta');
      } else {
        console.error('Error al seleccionar carpeta:', error);
        alert('Error al acceder a la carpeta seleccionada');
      }
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Función para cargar proyectos desde una carpeta
  const loadProjectsFromDirectory = async (directoryHandle) => {
    const projects = [];
    
    try {
      for await (const [name, fileHandle] of directoryHandle.entries()) {
        if (fileHandle.kind === 'file') {
          // Filtrar solo archivos de proyecto
          if (name.endsWith('.pixproj') || name.endsWith('.json')) {
            try {
              const file = await fileHandle.getFile();
              
              // Intentar leer el contenido para obtener metadatos
              const content = await file.text();
              let projectData = null;
              let dimensions = 'Sin datos';
              
              try {
                projectData = JSON.parse(content);
                dimensions = `${projectData.width || 64}×${projectData.height || 64}`;
              } catch (parseError) {
                console.warn(`No se pudo parsear ${name}:`, parseError);
              }

              projects.push({
                name: name.replace(/\.[^/.]+$/, ""),
                path: name,
                lastModified: file.lastModified,
                size: file.size,
                dimensions: dimensions,
                data: projectData,
                fileHandle: fileHandle, // Guardar el handle para cargar después
                id: Date.now() + Math.random()
              });
            } catch (fileError) {
              console.warn(`Error leyendo archivo ${name}:`, fileError);
            }
          }
        }
      }

      // Ordenar por fecha de modificación (más reciente primero)
      projects.sort((a, b) => b.lastModified - a.lastModified);
      
      setRecentProjects(projects);
      console.log(`Cargados ${projects.length} proyectos desde la carpeta`);
      
    } catch (error) {
      console.error('Error cargando proyectos:', error);
      alert('Error al cargar proyectos de la carpeta');
    }
  };

  // Función para cargar proyecto desde archivo directo
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setIsLoadingProjects(true);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const projectData = JSON.parse(e.target.result);
            
            // 💾 GUARDAR LOS DATOS DEL PROYECTO EN loadedData
            if (setLoadedData && typeof setLoadedData === 'function') {
              setLoadedData(projectData);
              console.log('✅ Datos del archivo guardados en loadedData:', file.name);
            }

            handleProjectSelect({
              name: file.name.replace(/\.[^/.]+$/, ""),
              path: file.name,
              lastModified: file.lastModified,
              dimensions: `${projectData.width || 64}×${projectData.height || 64}`,
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
    }
  };

  // Función para manejar selección de proyecto
  const handleProjectSelect = async (project) => {
    try {
      let projectData = project.data;

      // Si no tenemos los datos y tenemos el fileHandle, leer el archivo
      if (!projectData && project.fileHandle) {
        setIsLoadingProjects(true);
        const file = await project.fileHandle.getFile();
        const content = await file.text();
        projectData = JSON.parse(content);
      }

      if (projectData) {
        // 💾 GUARDAR LOS DATOS DEL PROYECTO EN loadedData
        if (setLoadedData && typeof setLoadedData === 'function') {
          setLoadedData(projectData);
          console.log('✅ Datos del proyecto guardados en loadedData:', project.name);
        }

        // Cargar proyecto directamente
        onComplete({
          name: project.name,
          width: projectData.width || 64,
          height: projectData.height || 64,
          projectData: projectData
        });
      } else {
        // Si no se puede cargar, agregarlo a la lista para referencia
        const newProject = {
          ...project,
          id: Date.now() + Math.random(),
        };
        
        setRecentProjects(prev => {
          const filtered = prev.filter(p => p.path !== project.path);
          return [newProject, ...filtered].slice(0, 15);
        });
      }
    } catch (error) {
      console.error('Error al abrir proyecto:', error);
      alert(`Error al abrir ${project.name}: ${error.message}`);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Función para formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePresetSelect = (preset, index) => {
    setSelectedPresetIndex(index);
    if (preset.name === 'Custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setCustomWidth(preset.width);
      setCustomHeight(preset.height);
    }
  };

  const handleStart = () => {
    if (selectedPresetIndex === null) return;
    
    const selectedPreset = sizePresets[selectedPresetIndex];
    const finalName = projectName.trim() || 'Untitled';
    const finalWidth = isCustom ? customWidth : selectedPreset.width;
    const finalHeight = isCustom ? customHeight : selectedPreset.height;
    
    setCompleteInitialize(true);
    
    setTimeout(() => {
      onComplete({
        name: finalName,
        width: finalWidth,
        height: finalHeight
      });
    }, 500);
  };

  const isValidSetup = () => {
    if (selectedPresetIndex === null) return false;
    if (isCustom) {
      return customWidth > 0 && customHeight > 0 && customWidth <= 2048 && customHeight <= 2048;
    }
    return true;
  };

  // Cargar proyectos recientes al montar el componente
  useEffect(() => {
    const savedProjects = localStorage.getItem('recentPixelProjects');
    if (savedProjects) {
      try {
        setRecentProjects(JSON.parse(savedProjects));
      } catch (error) {
        console.error('Error al cargar proyectos recientes:', error);
      }
    }

    // Intentar restaurar la carpeta predefinida si existe
    const savedFolderName = localStorage.getItem('defaultProjectFolder');
    if (savedFolderName) {
      console.log(`Carpeta predefinida guardada: ${savedFolderName}`);
    }
  }, []);

  // Guardar proyectos recientes cuando cambien
  useEffect(() => {
    if (recentProjects.length > 0) {
      localStorage.setItem('recentPixelProjects', JSON.stringify(
        recentProjects.map(p => ({
          ...p,
          fileHandle: undefined // No guardar fileHandle en localStorage
        }))
      ));
    }
  }, [recentProjects]);

  return (
    <div className={`initialize-overlay ${completeInitialize ? 'completing' : ''}`}>
      <div className="initialize-container">
        {/* Header */}
        <div className="initialize-header">
          <div className="header-icon">
            <div className="pixel-icon">
              <div className="pixel"></div>
              <div className="pixel"></div>
              <div className="pixel"></div>
              <div className="pixel"></div>
            </div>
          </div>
          <h1 className="app-title">PixCalli Studio</h1>
          <p className="app-subtitle">Editor de Sprites para pixel art</p>
        </div>

        {/* Main Content */}
        <div className="initialize-content">
          {/* Left Panel - Project Setup */}
          <div className="setup-panel">
            
            {/* Project Name */}
            <div className='initialize-action'>
              <div className="new-input-group">
                <h2>Nuevo Proyecto</h2>    
                <label htmlFor="project-name">Nombre del Proyecto</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ingresa el nombre o déjalo en blanco para 'Untitled'"
                  className="project-name-input"
                />
              </div>
              
              <div className='open-project-container'>
                <div className="open-project-header">
                  <h2>Abrir Proyecto</h2>
                  <div className="folder-buttons">
                    {supportsFileSystemAccess && (
                      <button 
                        className="browse-folder-btn"
                        onClick={handleSelectFolder}
                        title="Seleccionar carpeta de proyectos"
                      >
                        <span className="browse-icon">📁</span>
                        Seleccionar Carpeta
                      </button>
                    )}
                    <button 
                      className="browse-files-btn"
                      onClick={() => document.getElementById('file-input').click()}
                      title="Seleccionar archivos individuales"
                    >
                      <span className="browse-icon">📄</span>
                      Explorar Archivos
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
                
                <div className="recent-projects">
                  <h3>
                    Proyectos Recientes 
                    {recentProjects.length > 0 && (
                      <span className="project-count">({recentProjects.length})</span>
                    )}
                  </h3>
                  <div className="projects-list">
                    {recentProjects.length > 0 ? (
                      recentProjects.map((project, index) => (
                        <div 
                          key={project.id || index} 
                          className="project-item"
                          onClick={() => handleProjectSelect(project)}
                        >
                          <div className="project-info">
                            <div className="project-details">
                              <h4 className="project-name">{project.name}</h4>
                              <p className="project-path" title={project.path}>
                                {project.path}
                                {project.size && (
                                  <span className="file-size"> • {formatFileSize(project.size)}</span>
                                )}
                              </p>
                            </div>
                            <div className="project-meta">
                              <span className="project-size">{project.dimensions}</span>
                              <span className="project-date">{formatDate(project.lastModified)}</span>
                            </div>
                          </div>
                          <div className="project-preview">
                            {project.thumbnail ? (
                              <img 
                                src={project.thumbnail} 
                                alt={`${project.name} preview`}
                                className="project-thumbnail"
                              />
                            ) : (
                              <div className="no-preview">
                                <span className="preview-icon">🎨</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-projects">
                        <div className="no-projects-icon">📂</div>
                        <p>No hay proyectos recientes</p>
                        <span>
                          {supportsFileSystemAccess 
                            ? 'Usa "Seleccionar Carpeta" para cargar una carpeta de proyectos'
                            : 'Usa "Explorar Archivos" para cargar proyectos'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Loading State */}
                {isLoadingProjects && (
                  <div className="loading-projects">
                    <div className="loading-spinner"></div>
                    <p>Cargando proyectos...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas Size */}
            <div className="input-group">
              <div className="presets-grid">
                {sizePresets.map((preset, index) => (
                  <div
                    key={index}
                    className={`preset-card ${selectedPresetIndex === index ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(preset, index)}
                  >
                    <div className="preset-icon">
                      {preset.name === 'Custom' ? '⚙️' : '🎮'}
                    </div>
                    <div className="preset-info">
                      <h3>{preset.name}</h3>
                      <p className="preset-size">
                        {preset.name === 'Custom' ? 'Custom' : `${preset.width} × ${preset.height}`}
                      </p>
                      <p className="preset-description">{preset.description}</p>
                    </div>
                  </div>
                ))}
                {isCustom && (
                  <div className="custom-dimensions">
                    <div className="dimension-inputs">
                      <div className="dimension-input">
                        <label htmlFor="custom-width">Width</label>
                        <input
                          id="custom-width"
                          type="number"
                          min="1"
                          max="2048"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1)}
                        />
                        <span className="input-unit">px</span>
                      </div>
                      <div className="dimension-separator">×</div>
                      <div className="dimension-input">
                        <label htmlFor="custom-height">Height</label>
                        <input
                          id="custom-height"
                          type="number"
                          min="1"
                          max="2048"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1)}
                        />
                        <span className="input-unit">px</span>
                      </div>
                    </div>
                    <p className="custom-hint">Maximum size: 2048 × 2048 pixels</p>
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <button
              className={`start-button ${isValidSetup() ? 'ready' : 'disabled'}`}
              onClick={handleStart}
              disabled={!isValidSetup()}
            >
              {completeInitialize ? (
                <span className="loading">
                  <div className="spinner"></div>
                  Creating Project...
                </span>
              ) : (
                <>
                 
                  Iniciar Proyecto
                  <span className="button-icon"><FaPaintbrush /></span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="initialize-footer">
          <div className="powered-by">
            <span>Powered by</span>
            <div className="company-logo">
              <div className="logo-icon">
                <img src=''/>
              </div>
              <span className="company-name">Argánion</span>
            </div>
          </div>
          <div className="footer-info">
            <span className="version">Versión Pre alpha 1.0.0</span>
            <span className="separator">•</span>
            <span className="copyright">© 2025 Argánion</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitializeProject;