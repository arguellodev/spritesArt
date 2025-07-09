 // Función para dibujar una curva cuadrática Bézier
 export const drawQuadraticCurve = (ctx, start, end, control, width) => {
    ctx.save();
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    
    const distance = Math.max(
      Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
      Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
      Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
    );
    
    const steps = Math.max(distance * 3, 50);
    const points = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x);
      const y = Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y);
      points.push({ x, y });
    }
    
    const drawPixelPerfectLine = (x0, y0, x1, y1, width) => {
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      let x = x0, y = y0;
      
      const offset = Math.floor(width / 2);
      const drawnPixels = new Set();
      
      while (true) {
        for (let dy = 0; dy < width; dy++) {
          for (let dx = 0; dx < width; dx++) {
            const px = x + dx - offset;
            const py = y + dy - offset;
            const key = `${px},${py}`;
            
            if (!drawnPixels.has(key) && px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
              ctx.fillRect(px, py, 1, 1);
              drawnPixels.add(key);
            }
          }
        }
        
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
    };
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      if (current.x !== next.x || current.y !== next.y) {
        drawPixelPerfectLine(current.x, current.y, next.x, next.y, width);
      }
    }
    
    const offset = Math.floor(width / 2);
    
    for (let dy = 0; dy < width; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const px = start.x + dx - offset;
        const py = start.y + dy - offset;
        if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
    
    for (let dy = 0; dy < width; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const px = end.x + dx - offset;
        const py = end.y + dy - offset;
        if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
    
    ctx.restore();
  };

  // Función para dibujar preview de curva
 export const drawPreviewCurve = (start, end, control, width) => {
    const distance = Math.max(
      Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
      Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
      Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
    );
    
    const steps = Math.max(distance * 3, 50);
    const points = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x);
      const y = Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y);
      points.push({ x, y });
    }
    
    const offset = Math.floor(width / 2);
    const drawnPixels = new Set();
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      if (current.x !== next.x || current.y !== next.y) {
        const dx = Math.abs(next.x - current.x);
        const dy = -Math.abs(next.y - current.y);
        const sx = current.x < next.x ? 1 : -1;
        const sy = current.y < next.y ? 1 : -1;
        let err = dx + dy;
        let x = current.x, y = current.y;
        
        while (true) {
          for (let brushY = 0; brushY < width; brushY++) {
            for (let brushX = 0; brushX < width; brushX++) {
              const px = x + brushX - offset;
              const py = y + brushY - offset;
              const key = `${px},${py}`;
              
              if (!drawnPixels.has(key)) {
                const screenX = (px - viewportOffset.x) * zoom;
                const screenY = (py - viewportOffset.y) * zoom;
                
                if (screenX >= 0 && screenY >= 0) {
                  ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
                  drawnPixels.add(key);
                }
              }
            }
          }
          
          if (x === next.x && y === next.y) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x += sx; }
          if (e2 <= dx) { err += dx; y += sy; }
        }
      }
    }
  };

  // Función para dibujar preview de línea
 export const drawPreviewLine = (x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    
    while (true) {
      const screenX = (x - viewportOffset.x) * zoom;
      const screenY = (y - viewportOffset.y) * zoom;
      
      if (screenX >= 0 && screenY >= 0) {
        previewCanvasRef.current?.getContext('2d')?.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
      }
      
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };

  // Función para dibujar un pincel
 export function drawBrush(ctx, canvasCoords, size) {
    const offset = Math.floor(size / 2);
    const startX = canvasCoords.x - offset;
    const startY = canvasCoords.y - offset;
    
    ctx.fillRect(startX, startY, size, size);
  }

  //Funciones para manejar el cuadrado: 
  // 2. Función para dibujar un rectángulo con bordes redondeados
 export const drawRoundedRect = (ctx, x, y, width, height, radius, borderWidth, borderColor, fillColor) => {
    // Asegurar que el radio no sea mayor que la mitad del lado más pequeño
    const maxRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
    const actualRadius = Math.min(radius, maxRadius);
    
    // Calcular las coordenadas del rectángulo
    const startX = Math.min(x, x + width);
    const startY = Math.min(y, y + height);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);
    
    // Función auxiliar para verificar si un punto está dentro del rectángulo redondeado
    const isInsideRoundedRect = (px, py, w, h, r) => {
      if (r <= 0) return true;
      
      // Esquina superior izquierda
      if (px < r && py < r) {
        const dx = r - px;
        const dy = r - py;
        return (dx * dx + dy * dy) <= (r * r);
      }
      // Esquina superior derecha
      else if (px >= w - r && py < r) {
        const dx = px - (w - r - 1);
        const dy = r - py;
        return (dx * dx + dy * dy) <= (r * r);
      }
      // Esquina inferior izquierda
      else if (px < r && py >= h - r) {
        const dx = r - px;
        const dy = py - (h - r - 1);
        return (dx * dx + dy * dy) <= (r * r);
      }
      // Esquina inferior derecha
      else if (px >= w - r && py >= h - r) {
        const dx = px - (w - r - 1);
        const dy = py - (h - r - 1);
        return (dx * dx + dy * dy) <= (r * r);
      }
      
      return true;
    };
    
    // Dibujar el rectángulo píxel por píxel
    for (let py = 0; py < rectHeight; py++) {
      for (let px = 0; px < rectWidth; px++) {
        const finalX = startX + px;
        const finalY = startY + py;
        
        if (finalX >= 0 && finalX < ctx.canvas.width && finalY >= 0 && finalY < ctx.canvas.height) {
          const isInside = isInsideRoundedRect(px, py, rectWidth, rectHeight, actualRadius);
          
          if (isInside) {
            let shouldDraw = false;
            let colorToUse = null;
            
            // Determinar si es borde o relleno
            const isBorder = borderWidth > 0 && (
              px < borderWidth || 
              px >= rectWidth - borderWidth || 
              py < borderWidth || 
              py >= rectHeight - borderWidth ||
              // Verificar bordes internos para esquinas redondeadas
              !isInsideRoundedRect(px - borderWidth, py - borderWidth, 
                                 rectWidth - 2 * borderWidth, rectHeight - 2 * borderWidth, 
                                 Math.max(0, actualRadius - borderWidth))
            );
            
            if (isBorder && borderColor && borderWidth > 0) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (!isBorder && fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }
            
            if (shouldDraw && colorToUse) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
              ctx.fillRect(finalX, finalY, 1, 1);
            }
          }
        }
      }
    }
  };

// 3. Función para dibujar preview del rectángulo
export const drawPreviewRect = (ctx, start, end, radius, borderWidth, borderColor, fillColor) => {
  const width = end.x - start.x;
  const height = end.y - start.y;
  
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const rectWidth = Math.abs(width);
  const rectHeight = Math.abs(height);
  
  const maxRadius = Math.min(rectWidth, rectHeight) / 2;
  const actualRadius = Math.min(radius, maxRadius);
  
  // Función auxiliar para verificar si un punto está dentro del rectángulo redondeado
  const isInsideRoundedRect = (px, py, w, h, r) => {
    if (r <= 0) return true;
    
    // Esquina superior izquierda
    if (px < r && py < r) {
      const dx = r - px;
      const dy = r - py;
      return (dx * dx + dy * dy) <= (r * r);
    }
    // Esquina superior derecha
    else if (px >= w - r && py < r) {
      const dx = px - (w - r - 1);
      const dy = r - py;
      return (dx * dx + dy * dy) <= (r * r);
    }
    // Esquina inferior izquierda
    else if (px < r && py >= h - r) {
      const dx = r - px;
      const dy = py - (h - r - 1);
      return (dx * dx + dy * dy) <= (r * r);
    }
    // Esquina inferior derecha
    else if (px >= w - r && py >= h - r) {
      const dx = px - (w - r - 1);
      const dy = py - (h - r - 1);
      return (dx * dx + dy * dy) <= (r * r);
    }
    
    return true;
  };
  
  // Dibujar preview píxel por píxel
  for (let py = 0; py < rectHeight; py++) {
    for (let px = 0; px < rectWidth; px++) {
      const isInside = isInsideRoundedRect(px, py, rectWidth, rectHeight, actualRadius);
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        const isBorder = borderWidth > 0 && (
          px < borderWidth || 
          px >= rectWidth - borderWidth || 
          py < borderWidth || 
          py >= rectHeight - borderWidth ||
          // Verificar bordes internos para esquinas redondeadas
          !isInsideRoundedRect(px - borderWidth, py - borderWidth, 
                             rectWidth - 2 * borderWidth, rectHeight - 2 * borderWidth, 
                             Math.max(0, actualRadius - borderWidth))
        );
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8; // Borde un poco más opaco
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6; // Relleno un poco más transparente
        }
        
        if (shouldDraw && colorToUse) {
          const canvasX = startX + px;
          const canvasY = startY + py;
          const screenX = (canvasX - viewportOffset.x) * zoom;
          const screenY = (canvasY - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};

//Funciones para manejar el triangulo:
// 2. Función para dibujar un triángulo
export const drawTriangle = (ctx, start, end, borderWidth, borderColor, fillColor) => {
  // Calcular las coordenadas del triángulo
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  
  if (width === 0 || height === 0) return;
  
  // Definir los tres vértices del triángulo (triángulo equilátero inscrito en rectángulo)
  const topX = startX + Math.floor(width / 2);
  const topY = startY;
  const bottomLeftX = startX;
  const bottomLeftY = startY + height;
  const bottomRightX = startX + width;
  const bottomRightY = startY + height;
  
  // Función para verificar si un punto está dentro del triángulo usando coordenadas baricéntricas
  const isInsideTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
    const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
    if (denominator === 0) return false;
    
    const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
    const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
    const c = 1 - a - b;
    
    return a >= 0 && b >= 0 && c >= 0;
  };
  
  // Función para calcular la distancia de un punto a una línea
  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Dibujar el triángulo píxel por píxel
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const finalX = startX + px;
      const finalY = startY + py;
      
      if (finalX >= 0 && finalX < ctx.canvas.width && finalY >= 0 && finalY < ctx.canvas.height) {
        const isInside = isInsideTriangle(finalX, finalY, topX, topY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY);
        
        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          
          // Determinar si es borde o relleno
          const isBorder = borderWidth > 0 && (
            distanceToLine(finalX, finalY, topX, topY, bottomLeftX, bottomLeftY) < borderWidth ||
            distanceToLine(finalX, finalY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY) < borderWidth ||
            distanceToLine(finalX, finalY, bottomRightX, bottomRightY, topX, topY) < borderWidth
          );
          
          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
          
          if (shouldDraw && colorToUse) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
            ctx.fillRect(finalX, finalY, 1, 1);
          }
        }
      }
    }
  }
};
// Dibujar la previa del triangulo
export const drawPreviewTriangle = (ctx, start, end, borderWidth, borderColor, fillColor) => {
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  
  if (width === 0 || height === 0) return;
  
  // Definir los tres vértices del triángulo
  const topX = startX + Math.floor(width / 2);
  const topY = startY;
  const bottomLeftX = startX;
  const bottomLeftY = startY + height;
  const bottomRightX = startX + width;
  const bottomRightY = startY + height;
  
  // Función para verificar si un punto está dentro del triángulo
  const isInsideTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
    const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
    if (denominator === 0) return false;
    
    const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
    const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
    const c = 1 - a - b;
    
    return a >= 0 && b >= 0 && c >= 0;
  };
  
  // Función para calcular la distancia de un punto a una línea
  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Dibujar preview píxel por píxel
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const canvasX = startX + px;
      const canvasY = startY + py;
      
      const isInside = isInsideTriangle(canvasX, canvasY, topX, topY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY);
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        const isBorder = borderWidth > 0 && (
          distanceToLine(canvasX, canvasY, topX, topY, bottomLeftX, bottomLeftY) < borderWidth ||
          distanceToLine(canvasX, canvasY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY) < borderWidth ||
          distanceToLine(canvasX, canvasY, bottomRightX, bottomRightY, topX, topY) < borderWidth
        );
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8; // Borde un poco más opaco
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6; // Relleno un poco más transparente
        }
        
        if (shouldDraw && colorToUse) {
          const screenX = (canvasX - viewportOffset.x) * zoom;
          const screenY = (canvasY - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};

//Funciones para la herramienta de circulo
// Después de la función drawRoundedRect
export const drawCircle = (ctx, centerX, centerY, radius, borderWidth, borderColor, fillColor) => {
  if (radius <= 0) return;
  
  const startX = centerX - radius;
  const startY = centerY - radius;
  const diameter = radius * 2;
  
  // Función auxiliar para verificar si un punto está dentro del círculo
  const isInsideCircle = (px, py, cx, cy, r) => {
    const dx = px - cx;
    const dy = py - cy;
    return (dx * dx + dy * dy) <= (r * r);
  };
  
  // Dibujar el círculo píxel por píxel
  for (let py = 0; py <= diameter; py++) {
    for (let px = 0; px <= diameter; px++) {
      const finalX = startX + px;
      const finalY = startY + py;
      
      if (finalX >= 0 && finalX < ctx.canvas.width && finalY >= 0 && finalY < ctx.canvas.height) {
        const relativeX = px - radius;
        const relativeY = py - radius;
        const distanceFromCenter = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
        
        const isInside = distanceFromCenter <= radius;
        
        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          
          // Determinar si es borde o relleno
          const isBorder = borderWidth > 0 && distanceFromCenter > (radius - borderWidth);
          
          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
          
          if (shouldDraw && colorToUse) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
            ctx.fillRect(finalX, finalY, 1, 1);
          }
        }
      }
    }
  }
};

// Después de drawPreviewRect
export const drawPreviewCircle = (ctx, center, end, borderWidth, borderColor, fillColor) => {
  const deltaX = end.x - center.x;
  const deltaY = end.y - center.y;
  const radius = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
  
  if (radius <= 0) return;
  
  const startX = center.x - radius;
  const startY = center.y - radius;
  const diameter = radius * 2;
  
  // Dibujar preview píxel por píxel
  for (let py = 0; py <= diameter; py++) {
    for (let px = 0; px <= diameter; px++) {
      const relativeX = px - radius;
      const relativeY = py - radius;
      const distanceFromCenter = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      
      const isInside = distanceFromCenter <= radius;
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        const isBorder = borderWidth > 0 && distanceFromCenter > (radius - borderWidth);
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8; // Borde un poco más opaco
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6; // Relleno un poco más transparente
        }
        
        if (shouldDraw && colorToUse) {
          const canvasX = startX + px;
          const canvasY = startY + py;
          const screenX = (canvasX - viewportOffset.x) * zoom;
          const screenY = (canvasY - viewportOffset.y) * zoom;
          
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};

//Funciones para dibujar la elipse:

export const drawEllipse = (ctx, startX, startY, endX, endY, borderWidth, borderColor, fillColor) => {
  // Calcular dimensiones y centro
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  const centerX = Math.min(startX, endX) + width / 2;
  const centerY = Math.min(startY, endY) + height / 2;
  
  if (width <= 0 || height <= 0) return;
  
  const radiusX = width / 2;
  const radiusY = height / 2;
  
  // Área de renderizado
  const left = Math.max(0, Math.floor(centerX - radiusX) - 1);
  const right = Math.min(ctx.canvas.width - 1, Math.ceil(centerX + radiusX) + 1);
  const top = Math.max(0, Math.floor(centerY - radiusY) - 1);
  const bottom = Math.min(ctx.canvas.height - 1, Math.ceil(centerY + radiusY) + 1);
  
  // Dibujar la elipse píxel por píxel
  for (let py = top; py <= bottom; py++) {
    for (let px = left; px <= right; px++) {
      // Coordenadas relativas al centro
      const relativeX = px - centerX;
      const relativeY = py - centerY;
      
      // Ecuación de la elipse: (x/a)² + (y/b)² <= 1
      const ellipseValue = (relativeX * relativeX) / (radiusX * radiusX) + 
                          (relativeY * relativeY) / (radiusY * radiusY);
      
      const isInside = ellipseValue <= 1;
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        
        // Determinar si es borde o relleno
        if (borderWidth > 0 && borderColor) {
          // Para el borde, calculamos si está en la región exterior del borde
          const innerRadiusX = Math.max(0, radiusX - borderWidth);
          const innerRadiusY = Math.max(0, radiusY - borderWidth);
          
          const innerEllipseValue = innerRadiusX > 0 && innerRadiusY > 0 ? 
            (relativeX * relativeX) / (innerRadiusX * innerRadiusX) + 
            (relativeY * relativeY) / (innerRadiusY * innerRadiusY) : 2;
          
          const isBorder = innerEllipseValue > 1;
          
          if (isBorder) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
        } else if (fillColor) {
          // Solo relleno, sin borde
          shouldDraw = true;
          colorToUse = fillColor;
        }
        
        if (shouldDraw && colorToUse) {
          ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }
};

export const drawPreviewEllipse = (ctx, start, end, borderWidth, borderColor, fillColor) => {
  // Calcular dimensiones y centro en coordenadas de canvas
  const canvasWidth = Math.abs(end.x - start.x);
  const canvasHeight = Math.abs(end.y - start.y);
  const canvasCenterX = Math.min(start.x, end.x) + canvasWidth / 2;
  const canvasCenterY = Math.min(start.y, end.y) + canvasHeight / 2;
  
  if (canvasWidth <= 0 || canvasHeight <= 0) return;
  
  const canvasRadiusX = (canvasWidth / 2);
  const canvasRadiusY = (canvasHeight / 2);
  
  // Área de renderizado EN COORDENADAS DE CANVAS
  const left = Math.max(0, Math.floor(canvasCenterX - canvasRadiusX) - 1);
  const right = Math.ceil(canvasCenterX + canvasRadiusX) + 1;
  const top = Math.max(0, Math.floor(canvasCenterY - canvasRadiusY) - 1);
  const bottom = Math.ceil(canvasCenterY + canvasRadiusY) + 1;
  
  // Iterar en coordenadas de canvas
  for (let cy = top; cy <= bottom; cy++) {
    for (let cx = left; cx <= right; cx++) {
      // Coordenadas relativas al centro en canvas
      const relativeX = cx - canvasCenterX;
      const relativeY = cy - canvasCenterY;
      
      // Ecuación de la elipse en coordenadas de canvas
      const ellipseValue = canvasRadiusX > 0 && canvasRadiusY > 0 ?
        (relativeX * relativeX) / (canvasRadiusX * canvasRadiusX) +
        (relativeY * relativeY) / (canvasRadiusY * canvasRadiusY) : 2;
      
       
      const isInside = ellipseValue <= 1;
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        if (borderWidth > 0 && borderColor) {
          const innerCanvasRadiusX = Math.max(0, canvasRadiusX - borderWidth);
          const innerCanvasRadiusY = Math.max(0, canvasRadiusY - borderWidth);
          
          const innerEllipseValue = innerCanvasRadiusX > 0 && innerCanvasRadiusY > 0 ?
            (relativeX * relativeX) / (innerCanvasRadiusX * innerCanvasRadiusX) +
            (relativeY * relativeY) / (innerCanvasRadiusY * innerCanvasRadiusY) : 2;
          
          const isBorder = innerEllipseValue > 1;
          
          if (isBorder) {
            shouldDraw = true;
            colorToUse = borderColor;
            alpha = 0.8;
          } else if (fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = 0.6;
          }
        } else if (fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6;
        }
        
        if (shouldDraw && colorToUse) {
          // Convertir a coordenadas de pantalla solo para dibujar
          const screenX = (cx - viewportOffset.x) * zoom;
          const screenY = (cy - viewportOffset.y) * zoom;
          
          // Verificar si está visible en pantalla
          if (screenX >= 0 && screenY >= 0 && 
              screenX < ctx.canvas.width && screenY < ctx.canvas.height) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.ceil(zoom), Math.ceil(zoom));
          }
        }
      }
    }
  }
};

