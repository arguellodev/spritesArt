import React from 'react';
import './PixelArt.css';

const PixelArt = ({ pixelMatrix, pixelSize = 20 }) => {
  // Validación básica
  if (!pixelMatrix || !pixelMatrix.length || !pixelMatrix[0].length) {
    return <div className="error">Matriz de píxeles no válida</div>;
  }

  return (
    <div className="pixel-art-container">
      <div
        className="pixel-art"
        style={{
          gridTemplateColumns: `repeat(${pixelMatrix[0].length}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${pixelMatrix.length}, ${pixelSize}px)`
        }}
      >
        {pixelMatrix.map((row, rowIndex) =>
          row.map((color, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="pixel"
              style={{
                backgroundColor: color,
                width: `${pixelSize}px`,
                height: `${pixelSize}px`
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PixelArt;