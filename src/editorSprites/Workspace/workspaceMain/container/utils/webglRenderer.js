"use no memo";

// Renderer WebGL auxiliar para `putImageData` acelerado en el canvas compuesto.
// ¡NO confundir con `hooks/useWebGLPaintBuffer.js`, que es el pipeline principal!
// Este helper monta un programa trivial (quad a pantalla completa + textura RGBA
// muestreada con NEAREST) y expone un reemplazo drop-in para `ctx.putImageData`.

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;

  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`;

export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Error compilando shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Error enlazando programa:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

// Crea el contexto GL, shaders, programa y buffers para un canvas dado.
// Retorna un "renderer" que se pasa luego a `putImageDataOptimized`.
// Retorna `null` si WebGL no está disponible.
export function initializeWebGLImageRenderer(canvas) {
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return null;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    FRAGMENT_SHADER_SOURCE
  );
  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
  const textureLocation = gl.getUniformLocation(program, "u_texture");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
    gl.STATIC_DRAW
  );

  return {
    gl,
    program,
    positionLocation,
    texCoordLocation,
    textureLocation,
    positionBuffer,
    texCoordBuffer,
    texture: gl.createTexture(),
  };
}

// Sustituto de `ctx.putImageData` usando el renderer WebGL. Si `renderer`
// es `null`, cae al `putImageData` de Canvas 2D como fallback.
// `canvas` es el canvas destino (normalmente el composite canvas ref).
export function putImageDataOptimized(canvas, renderer, imageData, x = 0, y = 0) {
  if (!canvas) return;

  if (renderer) {
    const {
      gl,
      program,
      positionLocation,
      texCoordLocation,
      textureLocation,
      positionBuffer,
      texCoordBuffer,
      texture,
    } = renderer;
    const { data, width, height } = imageData;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(textureLocation, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } else {
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, x, y);
  }
}

// Libera los recursos GL asociados a un renderer. Llamar en el cleanup del
// `useEffect` de montaje del canvas.
export function disposeWebGLImageRenderer(renderer) {
  if (!renderer) return;
  const { gl, program, texture, positionBuffer, texCoordBuffer } = renderer;
  if (!gl) return;
  gl.deleteProgram(program);
  gl.deleteTexture(texture);
  gl.deleteBuffer(positionBuffer);
  gl.deleteBuffer(texCoordBuffer);
}
