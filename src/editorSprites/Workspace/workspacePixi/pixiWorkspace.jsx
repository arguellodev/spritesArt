import React, { useRef, useEffect } from 'react';

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;
  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
  }
`;

const PixiCanvas = () => {
  const canvasRef = useRef(null);
  const zoomRef = useRef(10);
  const glRef = useRef(null);
  const textureRef = useRef(null);
  const pixelsRef = useRef(new Uint8Array(32 * 32 * 4)); // 32x32 RGBA

  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // Position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinates
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoords = [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const pixels = pixelsRef.current;
    pixels.fill(255); // Blanco RGBA

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    textureRef.current = texture;

    const draw = () => {
      const zoom = zoomRef.current;
      canvas.width = 32 * zoom;
      canvas.height = 32 * zoom;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Update texture with new pixels
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 32, 32, gl.RGBA, gl.UNSIGNED_BYTE, pixelsRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    draw();

    // Zoom handler
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      zoomRef.current = Math.max(1, Math.min(40, zoomRef.current + delta));
      draw();
    };

    // Click handler to paint pixels
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const zoom = zoomRef.current;
      const x = Math.floor((e.clientX - rect.left) / zoom);
      const y = Math.floor((e.clientY - rect.top) / zoom);
      if (x < 0 || x >= 32 || y < 0 || y >= 32) return;

      const index = (y * 32 + x) * 4;
      const pixels = pixelsRef.current;

      // Cambiar color a negro (puedes modificar esto)
      pixels[index] = 0;
      pixels[index + 1] = 0;
      pixels[index + 2] = 0;
      pixels[index + 3] = 255;

      draw();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: 'pixelated',
        display: 'block',
        margin: '0 auto',
        border: '1px solid black',
        cursor: 'crosshair',
      }}
    />
  );
};

export default PixiCanvas;
