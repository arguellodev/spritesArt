// VideoExporter.js - Sistema para convertir frames a video

class VideoExporter {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.canvas = null;
    this.ctx = null;
    this.isRecording = false;
  }

  /**
   * Inicializa el canvas para la exportación de video
   */
  initCanvas(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    
    // Configurar el contexto para pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
  }

  /**
   * Convierte frames a video MP4 usando MediaRecorder
   */
  async exportToVideo(frames, framesResume, options = {}) {
    const {
      width = 800,
      height = 600,
      fps = 30,
      backgroundColor = 'transparent',
      scaleFactor = 1,
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = options;

    try {
      // Inicializar canvas
      this.initCanvas(width * scaleFactor, height * scaleFactor);
      
      // Configurar MediaRecorder
      const stream = this.canvas.captureStream(fps);
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9', // Fallback a webm si MP4 no está disponible
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: 'video/webm'
        });
        onComplete(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        onError(event.error);
      };

      // Iniciar grabación
      this.mediaRecorder.start();
      this.isRecording = true;

      // Renderizar frames secuencialmente
      await this.renderFrameSequence(frames, framesResume, {
        backgroundColor,
        scaleFactor,
        fps,
        onProgress
      });

      // Detener grabación
      this.mediaRecorder.stop();
      this.isRecording = false;

    } catch (error) {
      onError(error);
    }
  }

  /**
   * Renderiza la secuencia de frames con timing preciso
   */
  async renderFrameSequence(frames, framesResume, options) {
    const { backgroundColor, scaleFactor, fps, onProgress } = options;
    const frameInterval = 1000 / fps; // Intervalo entre frames en ms
    
    let totalDuration = 0;
    let currentTime = 0;

    // Calcular duración total
    for (const frameNumber of frames) {
      const frameData = framesResume.frames[frameNumber];
      totalDuration += frameData?.duration || 100;
    }

    for (let i = 0; i < frames.length; i++) {
      const frameNumber = frames[i];
      const frameData = framesResume.frames[frameNumber];
      const frameDuration = frameData?.duration || 100;
      
      // Renderizar frame por la duración especificada
      const frameStartTime = Date.now();
      const targetEndTime = frameStartTime + frameDuration;
      
      while (Date.now() < targetEndTime && this.isRecording) {
        await this.renderFrame(frameNumber, frameData, {
          backgroundColor,
          scaleFactor
        });
        
        // Esperar al siguiente frame del video
        await this.waitForNextFrame(frameInterval);
      }
      
      currentTime += frameDuration;
      onProgress((currentTime / totalDuration) * 100);
    }
  }

  /**
   * Renderiza un frame individual en el canvas
   */
  async renderFrame(frameNumber, frameData, options) {
    const { backgroundColor, scaleFactor } = options;
    
    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Aplicar color de fondo si no es transparente
    if (backgroundColor !== 'transparent') {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Aplicar transformaciones globales del frame
    this.ctx.save();
    
    // Aplicar opacidad global del frame
    if (frameData?.opacity !== undefined) {
      this.ctx.globalAlpha = frameData.opacity;
    }
    
    // Aplicar rotación global del frame
    if (frameData?.rotation) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate((frameData.rotation * Math.PI) / 180);
      this.ctx.translate(-centerX, -centerY);
    }

    // Renderizar todas las capas del frame
    if (frameData?.layers) {
      for (const layer of frameData.layers) {
        await this.renderLayer(layer, scaleFactor);
      }
    }

    // Si no hay datos de capas, renderizar frame básico
    if (!frameData?.layers) {
      await this.renderBasicFrame(frameNumber, scaleFactor);
    }
    
    this.ctx.restore();
  }

  /**
   * Renderiza una capa individual
   */
  async renderLayer(layer, scaleFactor) {
    if (!layer.visible) return;

    this.ctx.save();
    
    // Aplicar transformaciones de la capa
    if (layer.opacity !== undefined) {
      this.ctx.globalAlpha *= layer.opacity;
    }
    
    if (layer.blendMode) {
      this.ctx.globalCompositeOperation = layer.blendMode;
    }
    
    // Aplicar transformaciones de posición y escala
    if (layer.transform) {
      const { x = 0, y = 0, scaleX = 1, scaleY = 1, rotation = 0 } = layer.transform;
      
      this.ctx.translate(x * scaleFactor, y * scaleFactor);
      this.ctx.scale(scaleX, scaleY);
      
      if (rotation) {
        this.ctx.rotate((rotation * Math.PI) / 180);
      }
    }

    // Renderizar contenido de la capa
    if (layer.type === 'image' && layer.imageData) {
      await this.renderImageLayer(layer, scaleFactor);
    } else if (layer.type === 'shape' && layer.shapeData) {
      this.renderShapeLayer(layer, scaleFactor);
    } else if (layer.type === 'text' && layer.textData) {
      this.renderTextLayer(layer, scaleFactor);
    }
    
    this.ctx.restore();
  }

  /**
   * Renderiza una capa de imagen
   */
  async renderImageLayer(layer, scaleFactor) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width = img.width, height = img.height, x = 0, y = 0 } = layer;
        
        // IMPORTANTE: Deshabilitar suavizado para pixel art
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        this.ctx.drawImage(
          img,
          x * scaleFactor,
          y * scaleFactor,
          width * scaleFactor,
          height * scaleFactor
        );
        resolve();
      };
      img.onerror = () => resolve();
      img.src = layer.imageData;
    });
  }
  
  // Y también modifica initCanvas en VideoExporter.js para asegurar pixel art:
  initCanvas(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    
    // CRITICO: Configurar para pixel art en TODAS las propiedades
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    this.ctx.oImageSmoothingEnabled = false;
  }

  /**
   * Renderiza una capa de forma geométrica
   */
  renderShapeLayer(layer, scaleFactor) {
    const { shapeData } = layer;
    const { type, color, strokeColor, strokeWidth, points } = shapeData;
    
    this.ctx.beginPath();
    
    if (color) {
      this.ctx.fillStyle = color;
    }
    
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = (strokeWidth || 1) * scaleFactor;
    }
    
    switch (type) {
      case 'rectangle':
        const { x, y, width, height } = shapeData;
        this.ctx.rect(x * scaleFactor, y * scaleFactor, width * scaleFactor, height * scaleFactor);
        break;
        
      case 'circle':
        const { centerX, centerY, radius } = shapeData;
        this.ctx.arc(centerX * scaleFactor, centerY * scaleFactor, radius * scaleFactor, 0, 2 * Math.PI);
        break;
        
      case 'polygon':
        if (points && points.length > 0) {
          this.ctx.moveTo(points[0].x * scaleFactor, points[0].y * scaleFactor);
          for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x * scaleFactor, points[i].y * scaleFactor);
          }
          this.ctx.closePath();
        }
        break;
    }
    
    if (color) this.ctx.fill();
    if (strokeColor) this.ctx.stroke();
  }

  /**
   * Renderiza una capa de texto
   */
  renderTextLayer(layer, scaleFactor) {
    const { textData } = layer;
    const { 
      text, 
      x = 0, 
      y = 0, 
      fontSize = 16, 
      fontFamily = 'Arial', 
      color = '#000000',
      align = 'left',
      baseline = 'top'
    } = textData;
    
    this.ctx.font = `${fontSize * scaleFactor}px ${fontFamily}`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    
    this.ctx.fillText(text, x * scaleFactor, y * scaleFactor);
  }

  /**
   * Renderiza un frame básico (fallback)
   */
  async renderBasicFrame(frameNumber, scaleFactor) {
    // Aquí puedes implementar la lógica para renderizar frames básicos
    // basándote en tu sistema de frames actual
    
    // Ejemplo básico:
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(
      10 * scaleFactor, 
      10 * scaleFactor, 
      100 * scaleFactor, 
      100 * scaleFactor
    );
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `${24 * scaleFactor}px Arial`;
    this.ctx.fillText(`Frame ${frameNumber}`, 20 * scaleFactor, 50 * scaleFactor);
  }

  /**
   * Espera al siguiente frame de video
   */
  waitForNextFrame(interval) {
    return new Promise(resolve => {
      setTimeout(resolve, interval);
    });
  }

  /**
   * Convierte frames a GIF animado
   */
  async exportToGIF(frames, framesResume, options = {}) {
    const {
      width = 800,
      height = 600,
      backgroundColor = 'transparent',
      scaleFactor = 1,
      quality = 10, // 0-30, menor es mejor calidad
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = options;

    try {
      // Nota: Para GIF necesitarías una librería como gif.js
      // Esta es una implementación conceptual
      
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: width * scaleFactor,
        height: height * scaleFactor,
        transparent: backgroundColor === 'transparent' ? 0x00000000 : null
      });

      this.initCanvas(width * scaleFactor, height * scaleFactor);

      for (let i = 0; i < frames.length; i++) {
        const frameNumber = frames[i];
        const frameData = framesResume.frames[frameNumber];
        const frameDuration = frameData?.duration || 100;

        await this.renderFrame(frameNumber, frameData, {
          backgroundColor,
          scaleFactor
        });

        gif.addFrame(this.canvas, { delay: frameDuration });
        onProgress(((i + 1) / frames.length) * 100);
      }

      gif.on('finished', (blob) => {
        onComplete(blob);
      });

      gif.on('progress', (progress) => {
        onProgress(progress * 100);
      });

      gif.render();

    } catch (error) {
      onError(error);
    }
  }

  /**
   * Descarga el archivo de video
   */
  downloadVideo(blob, filename = 'animation.webm') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    if (this.canvas) {
      this.canvas.remove();
    }
    
    this.canvas = null;
    this.ctx = null;
    this.recordedChunks = [];
  }
}

// Función de utilidad para usar el exportador
export const exportFramesToVideo = async (frames, framesResume, options = {}) => {
  const exporter = new VideoExporter();
  
  return new Promise((resolve, reject) => {
    exporter.exportToVideo(frames, framesResume, {
      ...options,
      onComplete: (blob) => {
        exporter.cleanup();
        resolve(blob);
      },
      onError: (error) => {
        exporter.cleanup();
        reject(error);
      }
    });
  });
};

export default VideoExporter;