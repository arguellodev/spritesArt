import React, { useState, useEffect, useRef } from "react";
import "./AIgenerator.css";
const AIgenerator = ({createLayerAndPaintDataUrlCentered}) => {
  // Estados principales
  const [provider, setProvider] = useState("pixflux");
  const [description, setDescription] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [useNegativePrompt, setUseNegativePrompt] = useState(false);
  const [selectedSize, setSelectedSize] = useState("128x128");
  const [customWidth, setCustomWidth] = useState(128);
  const [customHeight, setCustomHeight] = useState(128);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [savedImages, setSavedImages] = useState([]);
  const [saveDirectory, setSaveDirectory] = useState(null);
  const [apiToken, setApiToken] = useState(
    "d74fc09b-2f50-440d-a850-a3d218c59660"
  );
  const [error, setError] = useState("");
  // Estados para configuraciones avanzadas
  const [textGuidanceScale, setTextGuidanceScale] = useState(8);
  const [outline, setOutline] = useState("single color black outline");
  const [shading, setShading] = useState("flat shading");
  const [detail, setDetail] = useState("low detail");
  const [view, setView] = useState("side");
  const [direction, setDirection] = useState("north");
  const [isometric, setIsometric] = useState(false);
  const [noBackground, setNoBackground] = useState(false);
  const [initImage, setInitImage] = useState(null);
  const [initImageStrength, setInitImageStrength] = useState(300);
  const [styleImage, setStyleImage] = useState(null);
  const [styleStrength, setStyleStrength] = useState(0);

  const fileInputRef = useRef(null);
  const styleFileInputRef = useRef(null);
  const directoryInputRef = useRef(null);

  const [formData, setFormData] = useState({
    prompt: "",
    width: 128,
    height: 128,
    output_format: "png",
  });

  // Tamaños predefinidos
  const standardSizes = [
    { label: "32x32", value: "32x32" },
    { label: "64x64", value: "64x64" },
    { label: "128x128", value: "128x128" },
    { label: "256x256", value: "256x256" },
    { label: "400x400", value: "400x400" },
    { label: "Custom", value: "custom" },
  ];

  // Opciones de configuración
  const outlineOptions = [
    "single color black outline",
    "single color outline",
    "selective outline",
    "lineless",
  ];

  const shadingOptions = [
    "flat shading",
    "basic shading",
    "medium shading",
    "detailed shading",
    "highly detailed shading",
  ];

  const detailOptions = ["low detail", "medium detail", "highly detailed"];

  const viewOptions = ["side", "low top-down", "high top-down"];

  const directionOptions = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];

  // Cargar configuración del localStorage
  useEffect(() => {
    const savedDirectory = localStorage.getItem("pixellab-directory");
    const savedToken = localStorage.getItem("pixellab-token");

    if (savedDirectory) {
      setSaveDirectory(savedDirectory);
      loadSavedImages();
    }

    if (savedToken) {
      setApiToken(savedToken);
    }
  }, []);

  // Función para convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Manejar carga de imagen de referencia
  const handleImageUpload = async (event, type = "init") => {
    const file = event.target.files[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        if (type === "init") {
          setInitImage(base64);
        } else if (type === "style") {
          setStyleImage(base64);
        }
      } catch (error) {
        console.error("Error converting file to base64:", error);
      }
    }
  };

  // Seleccionar directorio de guardado
  const selectSaveDirectory = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const dirPath = dirHandle.name;
      setSaveDirectory(dirPath);
      localStorage.setItem("pixellab-directory", dirPath);
      loadSavedImages();
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  // Cargar imágenes guardadas
  const loadSavedImages = async () => {
    // Simulación de carga de imágenes - en un entorno real necesitarías usar File System Access API
    const mockImages = [
      {
        id: 1,
        name: "dragon_001.png",
        url: "data:image/png;base64,...",
        timestamp: Date.now(),
      },
      {
        id: 2,
        name: "castle_002.png",
        url: "data:image/png;base64,...",
        timestamp: Date.now() - 10000,
      },
    ];
    setSavedImages(mockImages);
  };

  // Obtener dimensiones de la imagen
  const getImageDimensions = () => {
    if (selectedSize === "custom") {
      return { width: customWidth, height: customHeight };
    }
    const [width, height] = selectedSize.split("x").map(Number);
    return { width, height };
  };

  // Generar imagen
  const generateImage = async () => {
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }

    if (!apiToken) {
      alert("Please enter your API token");
      return;
    }

    setIsGenerating(true);

    try {
      const dimensions = getImageDimensions();
      const endpoint =
        provider === "pixflux"
          ? "/generate-image-pixflux"
          : "/generate-image-bitforge";

      const basePayload = {
        description: description.trim(),
        negative_description: useNegativePrompt ? negativePrompt : "",
        image_size: dimensions,
        text_guidance_scale: textGuidanceScale,
        outline,
        shading,
        detail,
        view,
        direction,
        isometric,
        no_background: noBackground,
      };

      // Agregar configuraciones específicas del proveedor
      if (provider === "bitforge") {
        basePayload.style_strength = styleStrength;
        if (styleImage) {
          basePayload.style_image = {
            type: "base64",
            base64: styleImage.split(",")[1],
          };
        }
      }

      // Agregar imagen de referencia si existe
      if (initImage) {
        basePayload.init_image = {
          type: "base64",
          base64: initImage.split(",")[1],
        };
        basePayload.init_image_strength = initImageStrength;
      }

      const response = await fetch(`https://api.pixellab.ai/v1${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "godzilla",
          image_size: {
            width: parseInt(128),
            height: parseInt(128),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Esta fue la respuesta obtenida", data);
      setCurrentImage(data.image.base64);

      // Guardar imagen automáticamente
      if (saveDirectory) {
        await saveImageToDirectory(data.image.base64);
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert(
        "Error generating image. Please check your API token and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };
  const downloadImageFromBase64 = (base64Data, filename) => {
    try {
      console.log("Downloading image from base64...");

      // Convertir base64 a blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Base64 download successful");
      return true;
    } catch (error) {
      console.log("Base64 download failed:", error);
      return false;
    }
  };
  // Función mejorada para descargar imágenes (mantenida para compatibilidad)
  const downloadImage = async (imageUrl, filename) => {
    console.log("Attempting to download image:", imageUrl);

    // Si es una imagen base64, usar la función específica
    if (imageUrl.startsWith("data:image/")) {
      const base64Data = imageUrl.split(",")[1];
      return downloadImageFromBase64(base64Data, filename);
    }

    try {
      // Método 1: Intentar descarga directa con fetch
      const response = await fetch(imageUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`, // Si la imagen requiere autenticación
        },
      });

      console.log("Fetch response status:", response.status);

      if (response.ok) {
        const blob = await response.blob();
        console.log("Blob created successfully, size:", blob.size);

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log("Download successful via fetch method");
        return true;
      }
    } catch (error) {
      console.log("Fetch method failed:", error);
    }

    // Método 2: Descarga directa (fallback)
    try {
      console.log("Trying direct download method...");
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = filename;
      link.target = "_blank"; // Abrir en nueva pestaña si la descarga falla
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Direct download attempted");
      return true;
    } catch (error) {
      console.log("Direct download failed:", error);
      return false;
    }
  };

  //funcion de prueba:
  const handleGenerate = async () => {
    const dimensions = getImageDimensions();
    setIsGenerating(true);
    setError("");

    try {
      console.log("Sending request to PixelLab API...");
      console.log("Request body:", {
        description: description.trim(),
        image_size: dimensions,
      });

      const response = await fetch(
        "https://api.pixellab.ai/v1/generate-image-pixflux",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${"d74fc09b-2f50-440d-a850-a3d218c59660"}`,
          },
          body: JSON.stringify({
            description: description.trim(),
            image_size: dimensions,
          }),
        }
      );

      console.log("API Response status:", response.status);
      console.log("API Response headers:", response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("API Error data:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("API Response completa:", result);
      console.log("Image object:", result.image);
      console.log("Base64 image found:", result.image?.base64 ? "Yes" : "No");
      console.log("Image type:", result.image?.type);

      // Adaptar la respuesta según la estructura de PixelLab (result.image.base64)
      const images = result.image?.base64
        ? [
            {
              url: `data:image/png;base64,${result.image.base64}`,
              base64: result.image.base64,
              type: result.image.type,
              id: Date.now(),
            },
          ]
        : [];

      setCurrentImage(images);
      // setGeneratedImages(images);

      console.log("Images array:", images);

      // Auto-download PNG images - VERSIÓN MEJORADA
      if (formData.output_format === "png" && images.length > 0) {
        console.log("Starting auto-download process...");

        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const filename = `pixellab-${Date.now()}-${i + 1}.png`;

          console.log(`Scheduling download ${i + 1}:`, filename);

          // Intentar descarga con un pequeño delay
          setTimeout(async () => {
            console.log(`Attempting download ${i + 1}...`);
            const success = await downloadImage(image.url, filename);
            if (!success) {
              console.log("Auto-download failed. User can download manually.");
              // Opcional: mostrar mensaje al usuario
              setError(
                "Auto-download failed. Please use the download button manually."
              );
            }
          }, 1000 * i); // Delay progresivo para múltiples imágenes
        }
      }
    } catch (err) {
      console.error("Error in handleGenerate:", err);
      setError(err.message || "An error occurred while generating the image");
    } finally {
      setIsGenerating(false);
    }
  };

  // Guardar imagen en directorio
  const saveImageToDirectory = async (imageBase64) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `pixelart_${timestamp}.png`;

      // En un entorno real, usarías File System Access API
      const newImage = {
        id: Date.now(),
        name: filename,
        url: imageBase64,
        timestamp: Date.now(),
      };

      setSavedImages((prev) => [newImage, ...prev]);
    } catch (error) {
      console.error("Error saving image:", error);
    }
  };

  // Guardar token API
  const saveApiToken = () => {
    localStorage.setItem("pixellab-token", apiToken);
  };

  return (
    <div className="AIgenerator-overlay">
      <div className="pixellab-container">
        {/* Panel lateral izquierdo */}
        <div className="left-panel">
          <div className="panel-header">
            <h2>Generador IA</h2>
          </div>

          {/* API Token
          <div className="config-section">
            <label>API Token</label>
            <div className="input-group">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your API token"
                className="text-input"
              />
              <button onClick={saveApiToken} className="save-btn">
                Save
              </button>
            </div>
          </div> */}

          {/* Selector de proveedor */}
          <div className="config-section">
            <label>Provedor</label>
            <div className="provider-selector">
              <button
                className={`provider-btn ${
                  provider === "pixflux" ? "active" : ""
                }`}
                onClick={() => setProvider("pixflux")}
              >
                Pixflux
              </button>
              <button
                className={`provider-btn ${
                  provider === "bitforge" ? "active" : ""
                }`}
                onClick={() => setProvider("bitforge")}
              >
                Bitforge
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div className="config-section">
            <label>Descripción:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la imágen que quieres generar..."
              className="description-input"
              rows="3"
            />
          </div>

          {/* Negative Prompt */}
          <div className="config-section">
            <div className="checkbox-group">
              <button
                className="checkbox-btn"
                onClick={() => setUseNegativePrompt(!useNegativePrompt)}
              >
                <span className="checkbox-icon">
                  {useNegativePrompt ? "☑" : "☐"}
                </span>
                Use Negative Prompt
              </button>
            </div>
            {useNegativePrompt && (
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Describe what to avoid..."
                className="description-input"
                rows="2"
              />
            )}
          </div>

          {/* Selector de tamaño */}
          <div className="config-section">
            <label>Tamaño de imagen</label>
            <div className="size-selector">
              {standardSizes.map((size) => (
                <button
                  key={size.value}
                  className={`size-btn ${
                    selectedSize === size.value ? "active" : ""
                  }`}
                  onClick={() => setSelectedSize(size.value)}
                >
                  {size.label}
                </button>
              ))}
            </div>
            {selectedSize === "custom" && (
              <div className="custom-size-inputs">
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  placeholder="Width"
                  className="size-input"
                  min="32"
                  max="400"
                />
                <span>×</span>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  placeholder="Height"
                  className="size-input"
                  min="32"
                  max="400"
                />
              </div>
            )}
          </div>

          {/* Toggle configuraciones avanzadas */}
          <div className="config-section">
            <button
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="icon">⚙</span>
              Configuración avanzada:
            </button>
          </div>

          {/* Configuraciones avanzadas */}
          {showAdvanced && (
            <div className="advanced-settings">
              {/* Text Guidance Scale */}
              <div className="config-section">
                <label>Text Guidance Scale: {textGuidanceScale}</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={textGuidanceScale}
                  onChange={(e) => setTextGuidanceScale(Number(e.target.value))}
                  className="slider"
                />
              </div>

              {/* Outline */}
              <div className="config-section">
                <label>Outline</label>
                <select
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  className="select-input"
                >
                  {outlineOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shading */}
              <div className="config-section">
                <label>Shading</label>
                <select
                  value={shading}
                  onChange={(e) => setShading(e.target.value)}
                  className="select-input"
                >
                  {shadingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detail */}
              <div className="config-section">
                <label>Detail</label>
                <select
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  className="select-input"
                >
                  {detailOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* View */}
              <div className="config-section">
                <label>View</label>
                <select
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                  className="select-input"
                >
                  {viewOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction */}
              <div className="config-section">
                <label>Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="select-input"
                >
                  {directionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div className="config-section">
                <div className="checkbox-group">
                  <button
                    className="checkbox-btn"
                    onClick={() => setIsometric(!isometric)}
                  >
                    <span className="checkbox-icon">
                      {isometric ? "☑" : "☐"}
                    </span>
                    Isometric View
                  </button>
                </div>
                <div className="checkbox-group">
                  <button
                    className="checkbox-btn"
                    onClick={() => setNoBackground(!noBackground)}
                  >
                    <span className="checkbox-icon">
                      {noBackground ? "☑" : "☐"}
                    </span>
                    Transparent Background
                  </button>
                </div>
              </div>

              {/* Imagen de referencia */}
              <div className="config-section">
                <label>Reference Image</label>
                <button
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="icon">📁</span>
                  {initImage ? "Change Image" : "Upload Image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "init")}
                  style={{ display: "none" }}
                />
                {initImage && (
                  <div className="image-preview">
                    <img
                      src={initImage}
                      alt="Reference"
                      className="preview-img"
                    />
                    <button
                      className="remove-btn"
                      onClick={() => setInitImage(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {initImage && (
                  <div className="config-section">
                    <label>Init Image Strength: {initImageStrength}</label>
                    <input
                      type="range"
                      min="1"
                      max="999"
                      value={initImageStrength}
                      onChange={(e) =>
                        setInitImageStrength(Number(e.target.value))
                      }
                      className="slider"
                    />
                  </div>
                )}
              </div>

              {/* Configuraciones específicas de Bitforge */}
              {provider === "bitforge" && (
                <>
                  <div className="config-section">
                    <label>Style Image</label>
                    <button
                      className="upload-btn"
                      onClick={() => styleFileInputRef.current?.click()}
                    >
                      <span className="icon">🎨</span>
                      {styleImage ? "Change Style" : "Upload Style"}
                    </button>
                    <input
                      ref={styleFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "style")}
                      style={{ display: "none" }}
                    />
                    {styleImage && (
                      <div className="image-preview">
                        <img
                          src={styleImage}
                          alt="Style"
                          className="preview-img"
                        />
                        <button
                          className="remove-btn"
                          onClick={() => setStyleImage(null)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="config-section">
                    <label>Style Strength: {styleStrength}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={styleStrength}
                      onChange={(e) => setStyleStrength(Number(e.target.value))}
                      className="slider"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Selector de directorio */}
          <div className="config-section">
            <label>Guardar en directorio</label>
            <button className="upload-btn" onClick={selectSaveDirectory}>
              <span className="icon">📂</span>
              {saveDirectory ? saveDirectory : "Selecciona el directorio"}
            </button>
          </div>

          {/* Botón de generar */}
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
          >
            {isGenerating ? "Generando..." : "Generar Imagen"}
          </button>
        </div>

        {/* Panel derecho */}
        <div className="right-panel-preview">
          {/* Canvas principal */}
          <div className="main-canvas">
            {currentImage &&
          <div className="canvasIA-actions-container">
              <button>Descargar</button>
              <button onClick={()=>createLayerAndPaintDataUrlCentered(currentImage[0].url)}>Incrustar imagen en canvas</button>
              <button> Ver en grande</button>
            </div>}
            {isGenerating ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Generando el pixel art...</p>
              </div>
            ) : currentImage ? (
              <div
                className="currentimage-canvas"
                style={{
                  backgroundImage: `url(${currentImage[0].url})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  imageRendering: "pixelated",
                }}
              ></div>
            ) : (
              <div className="empty-canvas">
                <p>El arte pixel art generado aparecera aquí</p>
              </div>
            )}
            
          </div>

          {/* Galería de imágenes guardadas */}
          <div className="image-gallery">
            <h3>Imagenes creadas:</h3>
            <div className="gallery-grid">
              {savedImages.map((image) => (
                <div key={image.id} className="gallery-item">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="gallery-image"
                  />
                  <div className="gallery-info">
                    <span className="image-name">{image.name}</span>
                    <button className="download-btn">
                      <span className="icon">⬇</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIgenerator;
