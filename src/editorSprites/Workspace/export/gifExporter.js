// gifExporter.js — exportación a GIF animado usando gifenc.
// Recibe una lista de canvases ya compuestos/escalados (uno por frame) y sus duraciones,
// y produce un Blob image/gif descargable.
//
// Reutiliza el mismo pipeline de composición+escalado que animationExporter usa para PNG/Video:
// quien llame debe pasar canvases ya renderizados con renderFrameToCanvas().

import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export class GifExporter {
  /**
   * Exporta una animación a GIF.
   *
   * @param {object} opts
   * @param {HTMLCanvasElement[]} opts.canvases        Canvases por frame (ya escalados).
   * @param {number[]}             opts.durationsMs    Duración de cada frame en ms.
   * @param {string}               [opts.backgroundColor='transparent']
   *                                                   Si no es 'transparent', se rellena el fondo.
   * @param {number}               [opts.maxColors=256] Máximo de colores por paleta (<=256).
   * @param {'rgb565'|'rgb444'}    [opts.quantizeFormat='rgb565']
   *                                                   Precisión del quantizer; rgb565 = mejor calidad.
   * @param {number}               [opts.loop=0]       0 = loop infinito, N = reproducir N veces.
   * @param {(p:number)=>void}     [opts.onProgress]   Callback de progreso 0..100.
   * @returns {Promise<Blob>}                          Blob con MIME image/gif.
   */
  async export({
    canvases,
    durationsMs,
    backgroundColor = 'transparent',
    maxColors = 256,
    quantizeFormat = 'rgb565',
    loop = 0,
    onProgress,
  }) {
    if (!canvases?.length) throw new Error('No hay canvases para exportar a GIF');
    if (canvases.length !== durationsMs.length) {
      throw new Error('canvases y durationsMs deben tener el mismo tamaño');
    }

    const width = canvases[0].width;
    const height = canvases[0].height;

    const gif = GIFEncoder();
    // La paleta global se infiere por frame (quantize); gifenc soporta paleta local por frame.
    const wantTransparent = backgroundColor === 'transparent';

    for (let i = 0; i < canvases.length; i++) {
      const source = canvases[i];
      // Garantizar tamaño homogéneo: si cambia, componer sobre un canvas base del tamaño del primero.
      const frameCanvas =
        source.width === width && source.height === height
          ? source
          : this._padToSize(source, width, height);

      const ctx = frameCanvas.getContext('2d');
      const { data } = ctx.getImageData(0, 0, width, height);

      // Rellenar fondo opaco si se pidió. gifenc interpreta alpha=0 como transparente.
      // Para fondos sólidos la composición ya pasó por animationExporter.renderFrameToCanvas.
      const palette = quantize(data, maxColors, { format: quantizeFormat });
      const index = applyPalette(data, palette);

      // El delay del GIF se expresa en centésimas de segundo (CS). Mínimo 2cs en la mayoría de viewers
      // para evitar que frames muy rápidos se rendericen a 10fps por defecto.
      const delayCs = Math.max(2, Math.round(durationsMs[i] / 10));

      const frameOpts = {
        palette,
        delay: delayCs * 10, // gifenc acepta ms directamente
      };
      if (wantTransparent) {
        frameOpts.transparent = true;
        // Usar el índice 0 como transparente (gifenc lo mapeará al primer color).
        frameOpts.transparentIndex = 0;
      }
      if (i === 0 && loop !== undefined) frameOpts.repeat = loop;

      gif.writeFrame(index, width, height, frameOpts);

      if (onProgress) onProgress(((i + 1) / canvases.length) * 100);
      // Ceder al event loop para no bloquear la UI con animaciones largas.
      if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
    }

    gif.finish();
    const bytes = gif.bytes();
    return new Blob([bytes], { type: 'image/gif' });
  }

  _padToSize(source, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0);
    return c;
  }

  downloadGif(blob, filename = 'animation.gif') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default GifExporter;
