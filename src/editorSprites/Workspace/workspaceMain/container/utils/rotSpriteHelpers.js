"use no memo";

// Wrapper puro del algoritmo RotSprite para rotar una selección de píxeles
// manteniendo la estética de pixel art. Envuelve `jsAlgorithm` desde
// `../../../rotesprite` para sacarlo del ciclo de vida del componente.
//
// A diferencia del `applyRotSprite` original, esta versión NO toca `setIsRotating`;
// eso lo gestiona el consumidor porque es estado de React. Tampoco lee
// `totalWidth`/`totalHeight` del componente: los recibe como parámetros.

import { jsAlgorithm } from "../../../rotesprite";

/**
 * Rota un conjunto de píxeles un ángulo arbitrario usando RotSprite.
 *
 * @param {Array<{x:number,y:number,color:{r:number,g:number,b:number,a:number}}>} pixels
 * @param {number} angle — ángulo en grados.
 * @param {{x:number,y:number,width:number,height:number}} bounds — bounding box de `pixels`.
 * @param {number} totalWidth — ancho del canvas destino (para clamping).
 * @param {number} totalHeight — alto del canvas destino.
 * @returns {Promise<Array>} los píxeles rotados, o los originales si hay error / ángulo 0.
 */
export async function applyRotSprite(
  pixels,
  angle,
  bounds,
  totalWidth,
  totalHeight
) {
  if (!pixels.length || angle === 0) return pixels;

  try {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    const width = bounds.width;
    const height = bounds.height;

    tempCanvas.width = width;
    tempCanvas.height = height;

    const imageData = tempCtx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }

    pixels.forEach((pixel) => {
      const relativeX = pixel.x - bounds.x;
      const relativeY = pixel.y - bounds.y;

      if (
        relativeX >= 0 &&
        relativeX < width &&
        relativeY >= 0 &&
        relativeY < height
      ) {
        const index = (relativeY * width + relativeX) * 4;
        const color = pixel.color;
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = color.a * 255;
      }
    });

    tempCtx.putImageData(imageData, 0, 0);

    const imageUrl = tempCanvas.toDataURL("image/png");
    const resultCanvas = document.createElement("canvas");

    const rotatedDataUrl = await jsAlgorithm(resultCanvas, imageUrl, angle);
    const resultImage = new Image();

    return await new Promise((resolve, reject) => {
      resultImage.onload = () => {
        try {
          const extractCanvas = document.createElement("canvas");
          const extractCtx = extractCanvas.getContext("2d");

          extractCanvas.width = resultImage.naturalWidth;
          extractCanvas.height = resultImage.naturalHeight;
          extractCtx.drawImage(resultImage, 0, 0);

          const resultImageData = extractCtx.getImageData(
            0,
            0,
            extractCanvas.width,
            extractCanvas.height
          );

          const rotatedPixels = [];
          const resultData = resultImageData.data;

          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const newCenterX = Math.floor(extractCanvas.width / 2);
          const newCenterY = Math.floor(extractCanvas.height / 2);

          for (let y = 0; y < extractCanvas.height; y++) {
            for (let x = 0; x < extractCanvas.width; x++) {
              const index = (y * extractCanvas.width + x) * 4;
              const alpha = resultData[index + 3];

              if (alpha > 0) {
                const finalX = Math.round(centerX + (x - newCenterX));
                const finalY = Math.round(centerY + (y - newCenterY));

                if (
                  finalX >= 0 &&
                  finalX < totalWidth &&
                  finalY >= 0 &&
                  finalY < totalHeight
                ) {
                  rotatedPixels.push({
                    x: finalX,
                    y: finalY,
                    color: {
                      r: resultData[index],
                      g: resultData[index + 1],
                      b: resultData[index + 2],
                      a: alpha / 255,
                    },
                  });
                }
              }
            }
          }

          resolve(rotatedPixels);
        } catch (error) {
          reject(error);
        }
      };

      resultImage.onerror = reject;
      resultImage.src = rotatedDataUrl;
    });
  } catch (error) {
    console.error("Error en RotSprite:", error);
    return pixels;
  }
}
