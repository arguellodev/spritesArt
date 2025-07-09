import React, { useState } from 'react';
import './AIgenerator.css';

const AIgenerator = () => {
  const apiKey = "d74fc09b-2f50-440d-a850-a3d218c59660"; // Temporal API key variable
  
  const [formData, setFormData] = useState({
    prompt: '',
    width: 128,
    height: 128,
    output_format: 'png'
  });

  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState('');

  const presetSizes = [
    { name: "Square Small", width: 128, height: 128 },
    { name: "Square Medium", width: 256, height: 256 },
    { name: "Square Large", width: 512, height: 512 },
    { name: "Portrait", width: 128, height: 256 },
    { name: "Landscape", width: 256, height: 128 },
    { name: "Widescreen", width: 512, height: 256 }
  ];

  const styles = [
    { value: 'pixel-art', label: 'Pixel Art' },
    { value: 'retro', label: 'Retro' },
    { value: '8-bit', label: '8-bit' },
    { value: '16-bit', label: '16-bit' },
    { value: 'isometric', label: 'Isometric' },
    { value: 'top-down', label: 'Top-down' },
    { value: 'side-scroller', label: 'Side-scroller' }
  ];

  const models = [
    { value: 'general', label: 'General' },
    { value: 'character', label: 'Character' },
    { value: 'environment', label: 'Environment' },
    { value: 'item', label: 'Item/Object' },
    { value: 'tile', label: 'Tile' }
  ];

  // Función mejorada para descargar imágenes desde base64
  const downloadImageFromBase64 = (base64Data, filename) => {
    try {
      console.log('Downloading image from base64...');
      
      // Convertir base64 a blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Base64 download successful');
      return true;
    } catch (error) {
      console.log('Base64 download failed:', error);
      return false;
    }
  };

  // Función mejorada para descargar imágenes (mantenida para compatibilidad)
  const downloadImage = async (imageUrl, filename) => {
    console.log('Attempting to download image:', imageUrl);
    
    // Si es una imagen base64, usar la función específica
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      return downloadImageFromBase64(base64Data, filename);
    }
    
    try {
      // Método 1: Intentar descarga directa con fetch
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}` // Si la imagen requiere autenticación
        }
      });
      
      console.log('Fetch response status:', response.status);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('Blob created successfully, size:', blob.size);
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('Download successful via fetch method');
        return true;
      }
    } catch (error) {
      console.log('Fetch method failed:', error);
    }
    
    // Método 2: Descarga directa (fallback)
    try {
      console.log('Trying direct download method...');
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank'; // Abrir en nueva pestaña si la descarga falla
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Direct download attempted');
      return true;
    } catch (error) {
      console.log('Direct download failed:', error);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSizePreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height
    }));
  };

  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    setFormData(prev => ({
      ...prev,
      seed: randomSeed.toString()
    }));
  };

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Sending request to PixelLab API...');
      console.log('Request body:', {
        description: formData.prompt,
        image_size: {
          width: parseInt(formData.width),
          height: parseInt(formData.height)
        }
      });

      const response = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        /* en total deben estar todos estos parametros para poder elegir: {
  "description": "",
  "negative_description": "",
  "image_size": {
    "width": 16,
    "height": 16
  },
  "text_guidance_scale": 8,
  "outline": "single color black outline",
  "shading": "flat shading",
  "detail": "high detail",
  "view": "side",
  "direction": "north",
  "isometric": false,
  "no_background": false,
  "init_image": {
    "type": "base64",
    "base64": ""
  },
  "init_image_strength": 300,
  "color_image": {
    "type": "base64",
    "base64": ""
  },
  "seed": 1
}      
        */
        body: JSON.stringify({
          description: formData.prompt,
          image_size: {
            width: parseInt(formData.width),
            height: parseInt(formData.height)
          }
        })
      });

      console.log('API Response status:', response.status);
      console.log('API Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('API Error data:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response completa:', result);
      console.log('Image object:', result.image);
      console.log('Base64 image found:', result.image?.base64 ? 'Yes' : 'No');
      console.log('Image type:', result.image?.type);
      
      // Adaptar la respuesta según la estructura de PixelLab (result.image.base64)
      const images = result.image?.base64 ? [{ 
        url: `data:image/png;base64,${result.image.base64}`, 
        base64: result.image.base64,
        type: result.image.type,
        id: Date.now() 
      }] : [];
      setGeneratedImages(images);
      
      console.log('Images array:', images);
      
      // Auto-download PNG images - VERSIÓN MEJORADA
      if (formData.output_format === 'png' && images.length > 0) {
        console.log('Starting auto-download process...');
        
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const filename = `pixellab-${Date.now()}-${i + 1}.png`;
          
          console.log(`Scheduling download ${i + 1}:`, filename);
          
          // Intentar descarga con un pequeño delay
          setTimeout(async () => {
            console.log(`Attempting download ${i + 1}...`);
            const success = await downloadImage(image.url, filename);
            if (!success) {
              console.log('Auto-download failed. User can download manually.');
              // Opcional: mostrar mensaje al usuario
              setError('Auto-download failed. Please use the download button manually.');
            }
          }, 1000 * i); // Delay progresivo para múltiples imágenes
        }
      }
      
    } catch (err) {
      console.error('Error in handleGenerate:', err);
      setError(err.message || 'An error occurred while generating the image');
    } finally {
      setLoading(false);
    }
  };

  const handleManualDownload = async (imageUrl, index) => {
    const filename = `pixellab-${Date.now()}-${index + 1}.${formData.output_format}`;
    console.log('Manual download requested for:', filename);
    
    // Si es una imagen base64, extraer solo la parte base64
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      const success = downloadImageFromBase64(base64Data, filename);
      
      if (!success) {
        console.log('Manual base64 download failed');
        // Como último recurso, abrir en nueva pestaña
        window.open(imageUrl, '_blank');
      }
      return;
    }
    
    const success = await downloadImage(imageUrl, filename);
    
    if (!success) {
      console.log('Manual download failed, opening in new tab...');
      // Como último recurso, abrir en nueva pestaña
      window.open(imageUrl, '_blank');
    }
  };

  const handleReset = () => {
    setFormData({
      prompt: '',
      width: 128,
      height: 128,
      output_format: 'png'
    });
    setGeneratedImages([]);
    setError('');
  };

  return (
    <div className="AIgenerator-overlay">
      <div className="AIgenerator-container">
        <div className="ai-generator-header">
          <h2>Generador de imagenes con Inteligencia Artificial </h2>
          <button className="close-btn" onClick={() => {}}>×</button>
        </div>

        <div className="ai-generator-content">
          <div className="generator-form">
            {/* Prompt Section */}
            <div className="form-section">
              <label htmlFor="prompt">Prompt *</label>
              <textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleInputChange}
                placeholder="Describe tu imagen a generar"
                rows="3"
                required
              />
            </div>

            {/* Size Controls */}
            <div className="form-section">
              <label>Tamaño de imágen</label>
              <div className="size-presets">
                {presetSizes.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`preset-btn ${formData.width === preset.width && formData.height === preset.height ? 'active' : ''}`}
                    onClick={() => handleSizePreset(preset)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="size-inputs">
                <div className="input-group">
                  <label htmlFor="width">Ancho</label>
                  <input
                    type="number"
                    id="width"
                    name="width"
                    value={formData.width}
                    onChange={handleInputChange}
                    min="64"
                    max="1024"
                    step="64"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="height">Alto</label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    min="64"
                    max="1024"
                    step="64"
                  />
                </div>
              </div>
            </div>

            {/* Output Format */}
            <div className="form-section">
              <label htmlFor="output_format">Output Format</label>
              <select
                id="output_format"
                name="output_format"
                value={formData.output_format}
                onChange={handleInputChange}
              >
                <option value="png">PNG (Auto-download)</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                className="reset-btn"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="button"
                className="generate-btn"
                onClick={handleGenerate}
                disabled={loading || !formData.prompt.trim()}
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <div className="generated-images">
              <h3>Generated Images</h3>
              <div className="images-grid">
                {generatedImages.map((image, index) => (
                  <div key={index} className="image-item">
                    <img src={image.url} alt={`Generated ${index + 1}`} />
                    <div className="image-actions">
                      <button onClick={() => window.open(image.url, '_blank')}>
                        View Full Size
                      </button>
                      <button onClick={() => handleManualDownload(image.url, index)}>
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIgenerator;