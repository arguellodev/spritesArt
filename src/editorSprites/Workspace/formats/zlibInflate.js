// zlibInflate.js — wrapper para inflar (descomprimir) bytes zlib.
//
// Usa la API nativa de streams de los navegadores modernos (`DecompressionStream`),
// que está disponible en Chromium y Electron desde 2021. Si el entorno no la
// soporta, lanza un error descriptivo — en ese caso el usuario debería instalar
// `pako` como fallback.

/**
 * @param {Uint8Array} compressed   Datos comprimidos con zlib (incluye header/ADLER32).
 * @returns {Promise<Uint8Array>}   Datos descomprimidos.
 */
export async function inflate(compressed) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'DecompressionStream no disponible. Instala "pako" para soporte de zlib en entornos antiguos.'
    );
  }
  const stream = new Response(compressed).body.pipeThrough(new DecompressionStream('deflate'));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}
