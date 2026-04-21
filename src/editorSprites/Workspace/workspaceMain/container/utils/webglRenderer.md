# webglRenderer.js

## Propósito
Renderer WebGL auxiliar que acelera el `putImageData` sobre el *composite canvas* del editor. Monta un programa trivial (quad a pantalla completa + textura RGBA con muestreo NEAREST) y expone un reemplazo drop-in para `ctx.putImageData`. Con fallback automático a Canvas 2D cuando WebGL no está disponible.

> ⚠️ **No confundir con `src/editorSprites/Workspace/hooks/useWebGLPaintBuffer.js`.** Ese hook es el pipeline GL **principal** del editor (buffer de pintura persistente, shaders con zoom/viewportOffset). Este módulo es un renderer **auxiliar** y distinto que solo transfiere un `ImageData` ya calculado al canvas compuesto.

## API pública
- **`initializeWebGLImageRenderer(canvas)`** — `Renderer | null`. Crea contexto, shaders y buffers. Retorna `null` si WebGL no está disponible.
- **`createShader(gl, type, source)`** — `WebGLShader | null`.
- **`createProgram(gl, vertexShader, fragmentShader)`** — `WebGLProgram | null`.
- **`putImageDataOptimized(canvas, renderer, imageData, x, y)`** — `void`. Si `renderer` es `null`, cae al `putImageData` de Canvas 2D.
- **`disposeWebGLImageRenderer(renderer)`** — `void`. Libera GPU al desmontar.

Forma del `Renderer`:
```
{ gl, program, positionLocation, texCoordLocation, textureLocation,
  positionBuffer, texCoordBuffer, texture }
```

## Dependencias
- **Importa de:** nada.
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza las funciones inline `initializeWebGLImageRenderer`, `createShader`, `createProgram`, `putImageDataOptimized`).

## Estado gestionado
No aplica. El "estado" vive en el objeto renderer, que el consumidor guarda en un `useRef`.

## Efectos secundarios
- Crea contexto WebGL/WebGL2 sobre el canvas pasado.
- Sube texturas RGBA a la GPU en cada llamada a `putImageDataOptimized`.
- No modifica ningún DOM más allá del canvas destino.

## Notas de performance
- `putImageDataOptimized` es sustancialmente más rápido que `ctx.putImageData` en imágenes grandes con zoom alto; es crítico para el pipeline del *composite canvas*.
- El consumidor debe llamar a `disposeWebGLImageRenderer(renderer)` en el cleanup del `useEffect` de montaje para evitar fugas de GPU.
- `initializeWebGLImageRenderer` hace una única inicialización por canvas: guárdalo en un ref y no lo regeneres en cada render.
