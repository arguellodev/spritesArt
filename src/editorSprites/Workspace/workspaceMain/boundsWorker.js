self.onmessage = function (e) {
    try {
      const { width, height, buffer } = e.data;
      
      // Validar datos de entrada
      if (!buffer || !width || !height) {
        console.error("Invalid worker input data");
        self.postMessage(null);
        return;
      }
      
      const data = new Uint8ClampedArray(buffer);
      const totalPixels = width * height;
      
      console.log(`Worker processing: ${width}x${height} = ${totalPixels} pixels`);
      
      // Para áreas muy grandes, usar estrategia de muestreo
      if (totalPixels > 2000000) { // 2 millones de píxeles
        console.log("Using sampling strategy for large area");
        
        const step = Math.ceil(Math.sqrt(totalPixels / 500000)); // Reducir resolución
        let top = height, bottom = -1;
        let left = width, right = -1;
        
        // Muestreo con step para encontrar bounds aproximados
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
          }
        }
        
        // Refinar bounds en las áreas encontradas
        if (top < height && bottom >= 0 && left < width && right >= 0) {
          // Refinar top
          for (let y = Math.max(0, top - step); y <= Math.min(height - 1, top + step); y++) {
            let found = false;
            for (let x = left; x <= right; x++) {
              if (data[(y * width + x) * 4 + 3] > 0) {
                top = y;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          
          // Refinar bottom
          for (let y = Math.min(height - 1, bottom + step); y >= Math.max(0, bottom - step); y--) {
            let found = false;
            for (let x = left; x <= right; x++) {
              if (data[(y * width + x) * 4 + 3] > 0) {
                bottom = y;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          
          // Refinar left
          for (let x = Math.max(0, left - step); x <= Math.min(width - 1, left + step); x++) {
            let found = false;
            for (let y = top; y <= bottom; y++) {
              if (data[(y * width + x) * 4 + 3] > 0) {
                left = x;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          
          // Refinar right
          for (let x = Math.min(width - 1, right + step); x >= Math.max(0, right - step); x--) {
            let found = false;
            for (let y = top; y <= bottom; y++) {
              if (data[(y * width + x) * 4 + 3] > 0) {
                right = x;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
        
        if (left <= right && top <= bottom) {
          self.postMessage({
            x: left,
            y: top,
            width: right - left + 1,
            height: bottom - top + 1
          });
        } else {
          self.postMessage(null);
        }
        return;
      }
      
      // Algoritmo original para áreas pequeñas/medianas
      let top = 0, bottom = height - 1;
      let left = 0, right = width - 1;
      let found = false;
  
      // Top
      for (; top < height; top++) {
        for (let x = 0; x < width; x++) {
          if (data[(top * width + x) * 4 + 3] > 0) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
  
      // Bottom
      found = false;
      for (; bottom >= top; bottom--) {
        for (let x = 0; x < width; x++) {
          if (data[(bottom * width + x) * 4 + 3] > 0) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
  
      // Left
      found = false;
      for (; left < width; left++) {
        for (let y = top; y <= bottom; y++) {
          if (data[(y * width + left) * 4 + 3] > 0) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
  
      // Right
      found = false;
      for (; right >= left; right--) {
        for (let y = top; y <= bottom; y++) {
          if (data[(y * width + right) * 4 + 3] > 0) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
  
      if (left > right || top > bottom) {
        self.postMessage(null);
      } else {
        self.postMessage({
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1
        });
      }
    } catch (error) {
      console.error("Worker error:", error);
      self.postMessage(null);
    }
  };