// useWebGLPaintBuffer.js
import { useRef, useCallback, useEffect, useMemo } from 'react';

const useWebGLPaintBuffer = (canvasRef, canvasWidth, canvasHeight, zoom, viewportOffset) => {
  const glRef = useRef(null);
  const programRef = useRef(null);
  const textureRef = useRef(null);
  const bufferRef = useRef(null);
  const vertexBufferRef = useRef(null);
  const positionAttributeRef = useRef(null);
  const texCoordAttributeRef = useRef(null);
  const isInitializedRef = useRef(false);
  const bufferDataRef = useRef(null);

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  // Fragment shader source
  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `;

  const createShader = useCallback((gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }, []);

  const createProgram = useCallback((gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }, []);

  const initializeWebGL = useCallback(() => {
    if (!canvasRef.current || isInitializedRef.current) return false;

    try {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl', { 
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        alpha: true 
      });
      
      if (!gl) {
        console.warn('WebGL not supported, falling back to 2D canvas');
        return false;
      }

      glRef.current = gl;

      // Create shaders
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      
      if (!vertexShader || !fragmentShader) return false;

      // Create program
      const program = createProgram(gl, vertexShader, fragmentShader);
      if (!program) return false;

      programRef.current = program;

      // Get attribute and uniform locations
      positionAttributeRef.current = gl.getAttribLocation(program, 'a_position');
      texCoordAttributeRef.current = gl.getAttribLocation(program, 'a_texCoord');
      const textureUniform = gl.getUniformLocation(program, 'u_texture');

      // Create vertex buffer for quad
      const vertices = new Float32Array([
        // Position (x, y) | TexCoord (u, v)
        -1, -1,  0, 1, // Bottom-left
         1, -1,  1, 1, // Bottom-right
        -1,  1,  0, 0, // Top-left
         1,  1,  1, 0  // Top-right
      ]);

      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      vertexBufferRef.current = vertexBuffer;

      // Create texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Set texture parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      textureRef.current = texture;

      // Initialize buffer data
      const bufferSize = width * height * 4; // RGBA
      const buffer = new Uint8Array(bufferSize);
      // Initialize as transparent
      for (let i = 0; i < bufferSize; i += 4) {
        buffer[i] = 0;     // R
        buffer[i + 1] = 0; // G
        buffer[i + 2] = 0; // B
        buffer[i + 3] = 0; // A (transparent)
      }
      bufferDataRef.current = buffer;

      // Upload initial texture data
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        buffer
      );

      // Set up GL state
      gl.useProgram(program);
      gl.uniform1i(textureUniform, 0);
      
      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Set viewport
      gl.viewport(0, 0, canvas.width, canvas.height);

      isInitializedRef.current = true;
      console.log('WebGL paint buffer initialized successfully');
      return true;

    } catch (error) {
      console.error('WebGL initialization failed:', error);
      return false;
    }
  }, [canvasRef, canvasWidth, canvasHeight, createShader, createProgram]);

  const paintPixel = useCallback((canvasX, canvasY, color) => {
    if (!isInitializedRef.current || !glRef.current || !bufferDataRef.current) {
      return false;
    }

    try {
      const gl = glRef.current;
      const buffer = bufferDataRef.current;

      // *** CORRECCIÓN 1: Convertir coordenadas de canvas a viewport ***
      const viewportX = canvasX - viewportOffset.x;
      const viewportY = canvasY - viewportOffset.y;

      // *** CORRECCIÓN 2: Verificar límites del viewport ***
      if (viewportX < 0 || viewportX >= canvasWidth || 
          viewportY < 0 || viewportY >= canvasHeight) {
        return false; // Fuera del viewport visible
      }

      // *** CORRECCIÓN 3: NO invertir Y para el buffer (mantener coordenadas Canvas) ***
      const bufferX = Math.floor(viewportX);
      const bufferY = Math.floor(viewportY);

      // Calcular índice en el buffer
      const index = (bufferY * canvasWidth + bufferX) * 4;

      // Actualizar buffer data
      buffer[index] = Math.floor(color.r);
      buffer[index + 1] = Math.floor(color.g);
      buffer[index + 2] = Math.floor(color.b);
      buffer[index + 3] = Math.floor(color.a * 255);

      // *** CORRECCIÓN 4: Coordenadas para textura (AQUÍ SÍ invertir Y) ***
      const textureX = bufferX;
      const textureY = canvasHeight - 1 - bufferY; // Invertir Y para WebGL

      // Actualizar textura con pixel individual
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        textureX, textureY, // Coordenadas WebGL corregidas
        1, 1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([
          buffer[index],
          buffer[index + 1],
          buffer[index + 2],
          buffer[index + 3]
        ])
      );

      return true;
    } catch (error) {
      console.error('Error painting pixel:', error);
      return false;
    }
  }, [canvasWidth, canvasHeight, viewportOffset]);

  const paintPixelBrush = useCallback((centerX, centerY, brushSize, color) => {
    if (!isInitializedRef.current || !glRef.current || !bufferDataRef.current) {
      return false;
    }

    try {
      const gl = glRef.current;
      const buffer = bufferDataRef.current;

      // *** CORRECCIÓN: Convertir coordenadas del centro ***
      const viewportCenterX = centerX - viewportOffset.x;
      const viewportCenterY = centerY - viewportOffset.y;

      const halfSize = Math.floor(brushSize / 2);
      
      // Calcular región afectada en coordenadas de viewport
      const startX = Math.max(0, viewportCenterX - halfSize);
      const endX = Math.min(canvasWidth - 1, viewportCenterX + halfSize);
      const startY = Math.max(0, viewportCenterY - halfSize);
      const endY = Math.min(canvasHeight - 1, viewportCenterY + halfSize);
      
      const updateWidth = endX - startX + 1;
      const updateHeight = endY - startY + 1;
      
      if (updateWidth <= 0 || updateHeight <= 0) return false;
      
      // Crear buffer de actualización
      const updateBuffer = new Uint8Array(updateWidth * updateHeight * 4);
      let updateIndex = 0;
      
      // Actualizar píxeles del pincel
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const bufferIndex = (y * canvasWidth + x) * 4;
          
          updateBuffer[updateIndex] = color.r;
          updateBuffer[updateIndex + 1] = color.g;
          updateBuffer[updateIndex + 2] = color.b;
          updateBuffer[updateIndex + 3] = color.a * 255;
          
          // Actualizar buffer principal
          buffer[bufferIndex] = color.r;
          buffer[bufferIndex + 1] = color.g;
          buffer[bufferIndex + 2] = color.b;
          buffer[bufferIndex + 3] = color.a * 255;
          
          updateIndex += 4;
        }
      }

      // *** CORRECCIÓN: Coordenadas WebGL para textura ***
      const webglStartX = startX;
      const webglStartY = canvasHeight - endY - 1; // Invertir Y

      // Actualizar textura
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        webglStartX, webglStartY,
        updateWidth, updateHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        updateBuffer
      );

      return true;
    } catch (error) {
      console.error('Error painting brush:', error);
      return false;
    }
  }, [canvasWidth, canvasHeight, viewportOffset]);

  const render = useCallback(() => {
    if (!isInitializedRef.current || !glRef.current) return false;

    try {
      const gl = glRef.current;
      const program = programRef.current;
      const vertexBuffer = vertexBufferRef.current;

      // Clear canvas
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use program
      gl.useProgram(program);

      // Bind vertex buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      // Set up position attribute
      gl.enableVertexAttribArray(positionAttributeRef.current);
      gl.vertexAttribPointer(positionAttributeRef.current, 2, gl.FLOAT, false, 16, 0);

      // Set up texture coordinate attribute
      gl.enableVertexAttribArray(texCoordAttributeRef.current);
      gl.vertexAttribPointer(texCoordAttributeRef.current, 2, gl.FLOAT, false, 16, 8);

      // Bind texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);

      // Draw quad
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      return true;
    } catch (error) {
      console.error('Error rendering:', error);
      return false;
    }
  }, []);

  const clearBuffer = useCallback(() => {
    if (!bufferDataRef.current) return;

    const buffer = bufferDataRef.current;
    const bufferSize = width * height * 4;
    
    // Clear to transparent
    for (let i = 0; i < bufferSize; i += 4) {
      buffer[i] = 0;     // R
      buffer[i + 1] = 0; // G
      buffer[i + 2] = 0; // B
      buffer[i + 3] = 0; // A
    }

    if (isInitializedRef.current && glRef.current) {
      const gl = glRef.current;
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        buffer
      );
    }
  }, [width, height]);

  const getPixelData = useCallback((x, y) => {
    if (!bufferDataRef.current) return null;

    x = Math.max(0, Math.min(width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(height - 1, Math.floor(y)));

    const index = (y * width + x) * 4;
    const buffer = bufferDataRef.current;

    return {
      r: buffer[index],
      g: buffer[index + 1],
      b: buffer[index + 2],
      a: buffer[index + 3] / 255
    };
  }, [width, height]);

  const cleanup = useCallback(() => {
    if (!glRef.current) return;

    const gl = glRef.current;
    
    if (textureRef.current) {
      gl.deleteTexture(textureRef.current);
      textureRef.current = null;
    }
    
    if (vertexBufferRef.current) {
      gl.deleteBuffer(vertexBufferRef.current);
      vertexBufferRef.current = null;
    }
    
    if (programRef.current) {
      gl.deleteProgram(programRef.current);
      programRef.current = null;
    }

    isInitializedRef.current = false;
    bufferDataRef.current = null;
  }, []);

  // Auto initialize when canvas changes
  useEffect(() => {
    if (canvasRef.current && !isInitializedRef.current) {
      initializeWebGL();
    }

    return cleanup;
  }, [canvasRef.current, initializeWebGL, cleanup]);

  // Auto render when needed
  const renderFrame = useCallback(() => {
    if (isInitializedRef.current) {
      render();
    }
  }, [render]);

  return {
    isInitialized: isInitializedRef.current,
    initializeWebGL,
    paintPixel,
    paintPixelBrush,
    render: renderFrame,
    clearBuffer,
    getPixelData,
    cleanup
  };
};

export default useWebGLPaintBuffer;