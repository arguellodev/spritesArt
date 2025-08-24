import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import './Threeloader.css';

const SimpleObjModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState('');
  const [loadedModel, setLoadedModel] = useState(null);

  const sceneRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  // Inicializar escena 3D básica
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, 500 / 400, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true 
    });
    renderer.setSize(500, 400);
    rendererRef.current = renderer;

    // Lighting mejorado
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0);  // Más intensidad
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);  // Más intensidad
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Agregar cubo de prueba para verificar que funciona
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, wireframe: true });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.name = 'test-cube';
    scene.add(testCube);
    console.log('🟢 Cubo de prueba agregado');

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotar cubo de prueba si no hay modelo
      const cube = scene.getObjectByName('test-cube');
      if (cube && !loadedModel) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
      }
      
      if (loadedModel) {
        loadedModel.rotation.y += 0.01;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
    };
  }, [loadedModel]);

  const openModal = () => {
    setIsModalOpen(true);
    setError('');
    setSelectedFile(null);
    setLoadingProgress(0);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setError('');
    setIsLoading(false);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.obj')) {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Por favor selecciona un archivo .obj válido');
      setSelectedFile(null);
    }
  };

  const loadObjFile = () => {
    if (!selectedFile || !sceneRef.current) return;

    setIsLoading(true);
    setError('');
    setLoadingProgress(0);

    console.log('🚀 Iniciando carga del archivo:', selectedFile.name);

    // Crear URL del archivo
    const fileUrl = URL.createObjectURL(selectedFile);
    console.log('🔗 URL creada:', fileUrl);
    
    // Instantiate a loader
    const loader = new OBJLoader();
    console.log('⚙️ OBJLoader inicializado');
    
    // Load a resource
    loader.load(
      // Resource URL
      fileUrl,
      // Called when resource is loaded
      function(object) {
        console.log('✅ Objeto cargado:', object);
        console.log('📊 Tipo:', object.type, 'Children:', object.children.length);

        // Limpiar modelo anterior y cubo de prueba
        if (loadedModel) {
          console.log('🗑️ Removiendo modelo anterior');
          sceneRef.current.remove(loadedModel);
        }
        
        // Remover cubo de prueba
        const testCube = sceneRef.current.getObjectByName('test-cube');
        if (testCube) {
          console.log('🗑️ Removiendo cubo de prueba');
          sceneRef.current.remove(testCube);
        }

        // Debug: Analizar estructura del objeto
        let meshCount = 0;
        object.traverse((child) => {
          console.log('🔍 Objeto encontrado:', {
            type: child.type,
            name: child.name,
            isMesh: child.isMesh,
            hasGeometry: !!child.geometry,
            hasMaterial: !!child.material,
            materialType: child.material?.type
          });

          if (child.isMesh) {
            meshCount++;
            
            // Información detallada del mesh
            console.log('🔷 Mesh #' + meshCount + ':', {
              name: child.name,
              vertices: child.geometry?.attributes?.position?.count || 0,
              faces: child.geometry?.index ? child.geometry.index.count / 3 : 'No index',
              materialOriginal: child.material?.type || 'sin material'
            });

            // Forzar material visible
            child.material = new THREE.MeshPhongMaterial({ 
              color: 0xff6b6b,  // Color rojo visible
              side: THREE.DoubleSide,
              wireframe: false
            });
            
            console.log('🎨 Material aplicado: rojo sólido');
          }
        });

        console.log('📦 Total meshes encontrados:', meshCount);

        if (meshCount === 0) {
          console.warn('⚠️ No se encontraron meshes válidos');
          setError('El archivo no contiene geometría 3D válida');
          setIsLoading(false);
          return;
        }

        // Centrar y escalar el modelo
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📏 Dimensiones:', {
          center: {x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2)},
          size: {x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2)}
        });
        
        // Centrar
        object.position.sub(center);
        console.log('📍 Objeto centrado');
        
        // Escalar
        const maxSize = Math.max(size.x, size.y, size.z);
        console.log('📐 Tamaño máximo:', maxSize.toFixed(2));
        
        if (maxSize > 0) {
          const scaleFactor = 4 / maxSize;  // Aumentar factor de escala
          object.scale.setScalar(scaleFactor);
          console.log('🔍 Factor de escala:', scaleFactor.toFixed(4));
        } else {
          console.warn('⚠️ Tamaño es 0, usando escala 1');
          object.scale.setScalar(1);
        }

        // Agregar a la escena
        sceneRef.current.add(object);
        setLoadedModel(object);
        
        console.log('✅ Modelo agregado a la escena');
        console.log('🎬 Total objetos en escena:', sceneRef.current.children.length);
        
        setIsLoading(false);
        URL.revokeObjectURL(fileUrl);
        closeModal();
      },
      // Called when loading is in progress
      function(xhr) {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          setLoadingProgress(Math.round(percentComplete));
          console.log('📈 Progreso:', Math.round(percentComplete) + '%');
        } else {
          console.log('📊 Cargando... (sin info de progreso)');
        }
      },
      // Called when loading has errors
      function(error) {
        console.error('❌ Error al cargar:', error);
        console.error('📋 Detalles:', error.message);
        setError('Error al cargar: ' + error.message);
        setIsLoading(false);
        URL.revokeObjectURL(fileUrl);
      }
    );
  };

  return (
    <div className="app-container">
      {/* Visor 3D */}
      <div className="viewer-container">
        <h2>Visor de Modelos 3D</h2>
        <canvas ref={canvasRef} className="canvas-3d" />
        <p className="model-info">
          {loadedModel ? 'Modelo .obj cargado y rotando' : 'Cubo verde de prueba - Listo para cargar .obj'}
        </p>
        <button onClick={openModal} className="load-button">
          Cargar Archivo .OBJ
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Cargar Modelo .OBJ</h3>
              <button onClick={closeModal} className="close-button">×</button>
            </div>
            
            <div className="modal-body">
              <div className="file-section">
                <input
                  type="file"
                  accept=".obj"
                  onChange={handleFileSelect}
                  className="file-input"
                  id="obj-input"
                />
                <label htmlFor="obj-input" className="file-label">
                  {selectedFile ? selectedFile.name : 'Seleccionar archivo .OBJ'}
                </label>
              </div>

              {error && (
                <div className="error-message">{error}</div>
              )}

              {isLoading && (
                <div className="loading-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <span>Cargando... {loadingProgress}%</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={closeModal} className="cancel-button">
                Cancelar
              </button>
              <button 
                onClick={loadObjFile} 
                className="load-obj-button"
                disabled={!selectedFile || isLoading}
              >
                {isLoading ? 'Cargando...' : 'Cargar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleObjModal;