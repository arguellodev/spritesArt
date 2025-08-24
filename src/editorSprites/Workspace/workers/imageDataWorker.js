// ============================================================================
// ULTIMATE IMAGEDATA WEBWORKER SYSTEM - FIXED VERSION
// ============================================================================

// 1. WORKER POOL MANAGER - Gestiona múltiples workers inteligentemente
class ImageDataWorkerPool {
    constructor(maxWorkers = navigator.hardwareConcurrency || 4) {
      this.maxWorkers = Math.min(maxWorkers, 8); // Límite máximo de 8 workers
      this.workers = [];
      this.busyWorkers = new Set();
      this.taskQueue = [];
      this.workerStats = new Map();
      this.totalTasksProcessed = 0;
      
      console.log(`🚀 Initialized ImageData Worker Pool with ${this.maxWorkers} max workers`);
    }
  
    // Crear worker optimizado con transferable objects y cache
    createWorker() {
      const workerCode = `
        // ========================================================================
        // ULTIMATE IMAGEDATA WORKER - CÓDIGO INTERNO
        // ========================================================================
        
        // Cache interno del worker para reutilizar buffers
        class WorkerCache {
          constructor(maxSize = 20) {
            this.cache = new Map();
            this.maxSize = maxSize;
            this.hits = 0;
            this.misses = 0;
          }
          
          generateKey(canvasId, x, y, width, height) {
            return canvasId + '_' + x + '_' + y + '_' + width + '_' + height;
          }
          
          get(key) {
            if (this.cache.has(key)) {
              this.hits++;
              const value = this.cache.get(key);
              this.cache.delete(key);
              this.cache.set(key, value); // Move to end
              return value;
            }
            this.misses++;
            return null;
          }
          
          set(key, value) {
            if (this.cache.size >= this.maxSize) {
              const firstKey = this.cache.keys().next().value;
              this.cache.delete(firstKey);
            }
            this.cache.set(key, value);
          }
          
          getStats() {
            return {
              size: this.cache.size,
              hits: this.hits,
              misses: this.misses,
              hitRate: this.hits / (this.hits + this.misses) || 0
            };
          }
        }
        
        const workerCache = new WorkerCache();
        let canvasMap = new Map(); // Mapa de canvas transferidos
        let performanceStats = {
          tasksCompleted: 0,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          cacheStats: { hits: 0, misses: 0 }
        };
        
        // Función optimizada para obtener ImageData
        function getOptimizedImageData(canvas, x, y, width, height, options) {
          options = options || {};
          const startTime = performance.now();
          
          try {
            const ctx = canvas.getContext('2d', {
              alpha: options.preserveAlpha !== false,
              colorSpace: options.colorSpace || 'srgb',
              willReadFrequently: true // Optimización crítica
            });
            
            // Validar y ajustar coordenadas
            const boundedX = Math.max(0, Math.min(x, canvas.width - 1));
            const boundedY = Math.max(0, Math.min(y, canvas.height - 1));
            const boundedWidth = Math.max(1, Math.min(width, canvas.width - boundedX));
            const boundedHeight = Math.max(1, Math.min(height, canvas.height - boundedY));
            
            let imageData;
            const totalPixels = boundedWidth * boundedHeight;
            
            // Estrategia adaptativa basada en tamaño
            if (totalPixels < 10000) {
              // Directo para áreas pequeñas
              imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
            } else if (totalPixels < 100000) {
              // Optimizado para áreas medianas
              const tempCanvas = new OffscreenCanvas(boundedWidth, boundedHeight);
              const tempCtx = tempCanvas.getContext('2d');
              
              tempCtx.drawImage(
                canvas, 
                boundedX, boundedY, boundedWidth, boundedHeight,
                0, 0, boundedWidth, boundedHeight
              );
              
              imageData = tempCtx.getImageData(0, 0, boundedWidth, boundedHeight);
            } else {
              // Chunking para áreas muy grandes
              imageData = new ImageData(boundedWidth, boundedHeight);
              const chunkSize = 50000; // Procesar en chunks de 50k píxeles
              const chunksX = Math.ceil(boundedWidth / Math.sqrt(chunkSize));
              const chunksY = Math.ceil(boundedHeight / Math.sqrt(chunkSize));
              
              for (let cy = 0; cy < chunksY; cy++) {
                for (let cx = 0; cx < chunksX; cx++) {
                  const chunkX = Math.floor(cx * boundedWidth / chunksX);
                  const chunkY = Math.floor(cy * boundedHeight / chunksY);
                  const chunkW = Math.min(
                    Math.floor((cx + 1) * boundedWidth / chunksX) - chunkX,
                    boundedWidth - chunkX
                  );
                  const chunkH = Math.min(
                    Math.floor((cy + 1) * boundedHeight / chunksY) - chunkY,
                    boundedHeight - chunkY
                  );
                  
                  const chunkData = ctx.getImageData(
                    boundedX + chunkX, 
                    boundedY + chunkY, 
                    chunkW, 
                    chunkH
                  );
                  
                  // Copiar chunk al imageData principal
                  for (let py = 0; py < chunkH; py++) {
                    for (let px = 0; px < chunkW; px++) {
                      const srcIdx = (py * chunkW + px) * 4;
                      const dstIdx = ((chunkY + py) * boundedWidth + (chunkX + px)) * 4;
                      
                      imageData.data[dstIdx] = chunkData.data[srcIdx];         // R
                      imageData.data[dstIdx + 1] = chunkData.data[srcIdx + 1]; // G
                      imageData.data[dstIdx + 2] = chunkData.data[srcIdx + 2]; // B
                      imageData.data[dstIdx + 3] = chunkData.data[srcIdx + 3]; // A
                    }
                  }
                }
              }
            }
            
            const processingTime = performance.now() - startTime;
            performanceStats.tasksCompleted++;
            performanceStats.totalProcessingTime += processingTime;
            performanceStats.averageProcessingTime = 
              performanceStats.totalProcessingTime / performanceStats.tasksCompleted;
            
            return {
              imageData: imageData,
              metadata: {
                originalBounds: { x: x, y: y, width: width, height: height },
                actualBounds: { x: boundedX, y: boundedY, width: boundedWidth, height: boundedHeight },
                processingTime: processingTime,
                totalPixels: totalPixels,
                method: totalPixels < 10000 ? 'direct' : totalPixels < 100000 ? 'optimized' : 'chunked'
              }
            };
          } catch (error) {
            throw new Error('ImageData extraction failed: ' + error.message);
          }
        }
        
        // Función para análisis avanzado de imagen
        function analyzeImageData(imageData, options) {
          options = options || {};
          const data = imageData.data;
          const width = imageData.width;
          const height = imageData.height;
          const totalPixels = width * height;
          
          let transparentPixels = 0;
          let opaquePixels = 0;
          let minAlpha = 255;
          let maxAlpha = 0;
          let hasTransparency = false;
          
          const colorHistogram = options.includeHistogram ? {
            r: new Array(256).fill(0),
            g: new Array(256).fill(0),
            b: new Array(256).fill(0),
            a: new Array(256).fill(0)
          } : null;
          
          let bounds = options.findBounds ? {
            minX: width,
            maxX: -1,
            minY: height,
            maxY: -1
          } : null;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Análisis de transparencia
            if (a === 0) {
              transparentPixels++;
              hasTransparency = true;
            } else {
              opaquePixels++;
              
              // Calcular bounds solo para píxeles opacos
              if (bounds && a > 0) {
                const pixelIndex = (i / 4);
                const x = pixelIndex % width;
                const y = Math.floor(pixelIndex / width);
                
                bounds.minX = Math.min(bounds.minX, x);
                bounds.maxX = Math.max(bounds.maxX, x);
                bounds.minY = Math.min(bounds.minY, y);
                bounds.maxY = Math.max(bounds.maxY, y);
              }
            }
            
            minAlpha = Math.min(minAlpha, a);
            maxAlpha = Math.max(maxAlpha, a);
            
            // Histograma de colores
            if (colorHistogram) {
              colorHistogram.r[r]++;
              colorHistogram.g[g]++;
              colorHistogram.b[b]++;
              colorHistogram.a[a]++;
            }
          }
          
          return {
            totalPixels: totalPixels,
            transparentPixels: transparentPixels,
            opaquePixels: opaquePixels,
            hasTransparency: hasTransparency,
            alphaRange: { min: minAlpha, max: maxAlpha },
            transparencyRatio: transparentPixels / totalPixels,
            bounds: bounds && bounds.maxX >= bounds.minX ? {
              x: bounds.minX,
              y: bounds.minY,
              width: bounds.maxX - bounds.minX + 1,
              height: bounds.maxY - bounds.minY + 1
            } : null,
            histogram: colorHistogram
          };
        }
        
        // Función para aplicar efectos/filtros
        function applyImageEffect(imageData, effect, params) {
          params = params || {};
          const data = imageData.data;
          const newData = new Uint8ClampedArray(data);
          
          switch (effect) {
            case 'brightness':
              const brightness = params.value || 0;
              for (let i = 0; i < newData.length; i += 4) {
                newData[i] = Math.min(255, Math.max(0, newData[i] + brightness));     // R
                newData[i + 1] = Math.min(255, Math.max(0, newData[i + 1] + brightness)); // G
                newData[i + 2] = Math.min(255, Math.max(0, newData[i + 2] + brightness)); // B
              }
              break;
              
            case 'contrast':
              const contrast = params.value || 1;
              const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
              for (let i = 0; i < newData.length; i += 4) {
                newData[i] = Math.min(255, Math.max(0, factor * (newData[i] - 128) + 128));
                newData[i + 1] = Math.min(255, Math.max(0, factor * (newData[i + 1] - 128) + 128));
                newData[i + 2] = Math.min(255, Math.max(0, factor * (newData[i + 2] - 128) + 128));
              }
              break;
              
            case 'grayscale':
              for (let i = 0; i < newData.length; i += 4) {
                const gray = 0.299 * newData[i] + 0.587 * newData[i + 1] + 0.114 * newData[i + 2];
                newData[i] = gray;
                newData[i + 1] = gray;
                newData[i + 2] = gray;
              }
              break;
              
            case 'invert':
              for (let i = 0; i < newData.length; i += 4) {
                newData[i] = 255 - newData[i];
                newData[i + 1] = 255 - newData[i + 1];
                newData[i + 2] = 255 - newData[i + 2];
              }
              break;
          }
          
          return new ImageData(newData, imageData.width, imageData.height);
        }
        
        // Manejador principal de mensajes
        self.onmessage = function(e) {
          const startTime = performance.now();
          const taskId = e.data.taskId;
          const command = e.data.command;
          const data = e.data.data;
          
          try {
            let result;
            let transferables = [];
            
            switch (command) {
              case 'GET_IMAGE_DATA':
                const canvasId = data.canvasId;
                const x = data.x;
                const y = data.y;
                const width = data.width;
                const height = data.height;
                const options = data.options;
                const canvas = canvasMap.get(canvasId);
                
                if (!canvas) {
                  throw new Error('Canvas with ID ' + canvasId + ' not found');
                }
                
                // Verificar cache
                const cacheKey = workerCache.generateKey(canvasId, x, y, width, height);
                let cachedResult = workerCache.get(cacheKey);
                
                if (cachedResult) {
                  result = {
                    imageData: cachedResult.imageData,
                    metadata: cachedResult.metadata,
                    fromCache: true
                  };
                  performanceStats.cacheStats.hits++;
                } else {
                  const extractionResult = getOptimizedImageData(canvas, x, y, width, height, options);
                  
                  // Guardar en cache solo si no es muy grande
                  if (extractionResult.imageData.data.length < 2000000) { // < 500k píxeles
                    workerCache.set(cacheKey, extractionResult);
                  }
                  
                  result = {
                    imageData: extractionResult.imageData,
                    metadata: extractionResult.metadata,
                    fromCache: false
                  };
                  performanceStats.cacheStats.misses++;
                  transferables.push(result.imageData.data.buffer);
                }
                break;
                
              case 'ANALYZE_IMAGE_DATA':
                result = analyzeImageData(data.imageData, data.options);
                break;
                
              case 'APPLY_EFFECT':
                result = {
                  imageData: applyImageEffect(data.imageData, data.effect, data.params)
                };
                transferables.push(result.imageData.data.buffer);
                break;
                
              case 'REGISTER_CANVAS':
                canvasMap.set(data.canvasId, data.canvas);
                result = { success: true, canvasId: data.canvasId };
                break;
                
              case 'UNREGISTER_CANVAS':
                canvasMap.delete(data.canvasId);
                result = { success: true, canvasId: data.canvasId };
                break;
                
              case 'GET_STATS':
                result = {
                  performanceStats: performanceStats,
                  cacheStats: workerCache.getStats(),
                  registeredCanvases: canvasMap.size
                };
                break;
                
              case 'CLEAR_CACHE':
                workerCache.cache.clear();
                result = { success: true, cleared: true };
                break;
                
              default:
                throw new Error('Unknown command: ' + command);
            }
            
            const processingTime = performance.now() - startTime;
            
            self.postMessage({
              taskId: taskId,
              success: true,
              result: result,
              processingTime: processingTime,
              workerId: self.name || 'unknown'
            }, transferables);
            
          } catch (error) {
            self.postMessage({
              taskId: taskId,
              success: false,
              error: {
                message: error.message,
                stack: error.stack
              },
              processingTime: performance.now() - startTime,
              workerId: self.name || 'unknown'
            });
          }
        };
        
        // Heartbeat para mantener el worker activo
        setInterval(function() {
          self.postMessage({
            type: 'heartbeat',
            stats: {
              tasksCompleted: performanceStats.tasksCompleted,
              cacheHitRate: workerCache.getStats().hitRate,
              memoryUsage: canvasMap.size
            }
          });
        }, 30000); // Cada 30 segundos
      `;
  
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      const workerId = 'worker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      worker.name = workerId;
      
      // Estadísticas del worker
      this.workerStats.set(workerId, {
        tasksCompleted: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        errors: 0,
        createdAt: Date.now(),
        lastUsed: Date.now()
      });
      
      // Manejar heartbeat
      worker.addEventListener('message', (e) => {
        if (e.data.type === 'heartbeat') {
          const stats = this.workerStats.get(workerId);
          if (stats) {
            stats.lastUsed = Date.now();
            stats.heartbeatStats = e.data.stats;
          }
        }
      });
      
      console.log('👷 Created new ImageData worker: ' + workerId);
      return worker;
    }
  
    // Obtener worker disponible o crear uno nuevo
    async getWorker() {
      // Buscar worker disponible
      const availableWorker = this.workers.find(worker => !this.busyWorkers.has(worker));
      
      if (availableWorker) {
        this.busyWorkers.add(availableWorker);
        const stats = this.workerStats.get(availableWorker.name);
        if (stats) stats.lastUsed = Date.now();
        return availableWorker;
      }
      
      // Crear nuevo worker si no hemos alcanzado el límite
      if (this.workers.length < this.maxWorkers) {
        const newWorker = this.createWorker();
        this.workers.push(newWorker);
        this.busyWorkers.add(newWorker);
        return newWorker;
      }
      
      // Esperar a que se libere un worker
      return new Promise((resolve) => {
        this.taskQueue.push(resolve);
      });
    }
  
    // Liberar worker
    releaseWorker(worker) {
      this.busyWorkers.delete(worker);
      
      // Procesar siguiente tarea en cola
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.busyWorkers.add(worker);
        nextTask(worker);
      }
    }
  
    // Ejecutar tarea en worker
    async executeTask(command, data, options) {
      options = options || {};
      const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const worker = await this.getWorker();
      const timeout = options.timeout || 30000;
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.releaseWorker(worker);
          const stats = this.workerStats.get(worker.name);
          if (stats) stats.errors++;
          reject(new Error('Task ' + taskId + ' timed out after ' + timeout + 'ms'));
        }, timeout);
        
        const handleMessage = (e) => {
          if (e.data.taskId === taskId) {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', handleMessage);
            
            const stats = this.workerStats.get(worker.name);
            if (stats) {
              stats.tasksCompleted++;
              stats.totalProcessingTime += e.data.processingTime || 0;
              stats.averageProcessingTime = stats.totalProcessingTime / stats.tasksCompleted;
              if (!e.data.success) stats.errors++;
            }
            
            this.releaseWorker(worker);
            
            if (e.data.success) {
              resolve(e.data.result);
            } else {
              reject(new Error(e.data.error.message));
            }
          }
        };
        
        worker.addEventListener('message', handleMessage);
        worker.postMessage({ taskId: taskId, command: command, data: data });
      });
    }
  
    // API Methods
    async getImageData(canvasId, x, y, width, height, options) {
      options = options || {};
      return this.executeTask('GET_IMAGE_DATA', { canvasId: canvasId, x: x, y: y, width: width, height: height, options: options });
    }
  
    async analyzeImageData(imageData, options) {
      options = options || {};
      return this.executeTask('ANALYZE_IMAGE_DATA', { imageData: imageData, options: options });
    }
  
    async applyEffect(imageData, effect, params) {
      params = params || {};
      return this.executeTask('APPLY_EFFECT', { imageData: imageData, effect: effect, params: params });
    }
  
    async registerCanvas(canvasId, canvas) {
      // Para esta versión simplificada, solo registramos en un worker
      if (this.workers.length === 0) {
        this.createWorker();
        this.workers.push(this.workers[0]);
      }
      
      try {
        await this.executeTask('REGISTER_CANVAS', { canvasId: canvasId, canvas: canvas });
        console.log('✅ Canvas ' + canvasId + ' registered');
        return true;
      } catch (error) {
        console.error('❌ Failed to register canvas ' + canvasId + ':', error);
        throw error;
      }
    }
  
    async unregisterCanvas(canvasId) {
      try {
        await this.executeTask('UNREGISTER_CANVAS', { canvasId: canvasId });
        console.log('🗑️ Canvas ' + canvasId + ' unregistered');
      } catch (error) {
        console.error('❌ Failed to unregister canvas:', error);
      }
    }
  
    // Obtener estadísticas detalladas
    async getDetailedStats() {
      try {
        const workerStats = this.workers.length > 0 ? 
          await this.executeTask('GET_STATS', {}) : null;
        
        return {
          poolInfo: {
            totalWorkers: this.workers.length,
            busyWorkers: this.busyWorkers.size,
            maxWorkers: this.maxWorkers,
            queuedTasks: this.taskQueue.length,
            totalTasksProcessed: this.totalTasksProcessed
          },
          workerStats: Array.from(this.workerStats.entries()).map(([workerId, stats]) => ({
            workerId: workerId,
            tasksCompleted: stats.tasksCompleted,
            totalProcessingTime: stats.totalProcessingTime,
            averageProcessingTime: stats.averageProcessingTime,
            errors: stats.errors,
            uptime: Date.now() - stats.createdAt,
            idleTime: Date.now() - stats.lastUsed
          })),
          individualWorkerStats: workerStats ? [workerStats] : []
        };
      } catch (error) {
        console.error('Failed to get detailed stats:', error);
        return null;
      }
    }
  
    // Limpiar workers inactivos
    async cleanup() {
      const now = Date.now();
      const maxIdleTime = 5 * 60 * 1000; // 5 minutos
      
      const workersToTerminate = this.workers.filter(worker => {
        const stats = this.workerStats.get(worker.name);
        return stats && !this.busyWorkers.has(worker) && (now - stats.lastUsed) > maxIdleTime;
      });
      
      workersToTerminate.forEach(worker => {
        const index = this.workers.indexOf(worker);
        if (index > -1) {
          this.workers.splice(index, 1);
          this.workerStats.delete(worker.name);
          worker.terminate();
          console.log('🧹 Terminated idle worker: ' + worker.name);
        }
      });
      
      return workersToTerminate.length;
    }
  
    // Destruir pool completamente
    destroy() {
      this.workers.forEach(worker => {
        worker.terminate();
      });
      
      this.workers = [];
      this.busyWorkers.clear();
      this.taskQueue = [];
      this.workerStats.clear();
      
      console.log('💀 ImageData Worker Pool destroyed');
    }
  }
  
  // ============================================================================
  // INTEGRACIÓN SIMPLIFICADA PARA USAR CON REACT
  // ============================================================================
  
  // Instancia global del pool
  export const imageDataWorkerPool = new ImageDataWorkerPool();
  
  // Función simplificada para reemplazar getLayerData
  export const getLayerDataUltimate = async (layerCanvasesRef, layerId, x, y, width, height, options) => {
    options = options || {};
    
    try {
      const canvas = layerCanvasesRef.current[layerId];
      if (!canvas) return null;
      
      // Registrar canvas en el pool si no está registrado
      if (!canvas._registeredInPool) {
        // Crear una copia del canvas para transferir al worker
        const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        const offscreenCtx = offscreenCanvas.getContext('2d');
        offscreenCtx.drawImage(canvas, 0, 0);
        
        await imageDataWorkerPool.registerCanvas(layerId, offscreenCanvas);
        canvas._registeredInPool = true;
      }
      
      const result = await imageDataWorkerPool.getImageData(layerId, x, y, width, height, options);
      
      console.log('📊 ImageData retrieved: ' + result.metadata.totalPixels + ' pixels in ' + 
                  result.metadata.processingTime.toFixed(2) + 'ms (' + result.metadata.method + ')' + 
                  (result.fromCache ? ' - FROM CACHE' : ''));
      
      return result.imageData;
    } catch (error) {
      console.error('❌ Ultimate getLayerData failed:', error);
      return null;
    }
  };
  
  // Función para análisis de imagen
  export const analyzeLayerData = async (layerCanvasesRef, layerId, x, y, width, height, options) => {
    options = options || {};
    
    try {
      const imageData = await getLayerDataUltimate(layerCanvasesRef, layerId, x, y, width, height);
      if (!imageData) return null;
      
      const analysis = await imageDataWorkerPool.analyzeImageData(imageData, options);
      return analysis;
    } catch (error) {
      console.error('❌ Layer analysis failed:', error);
      return null;
    }
  };
  
  // Exportar funciones principales
  // Para usar en tu código, simplemente importa estas funciones:
  // import { imageDataWorkerPool, getLayerDataUltimate, analyzeLayerData } from './ultimate-worker.js';