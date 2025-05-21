const toolsMap = {
    pencil: (x, y, parameters) => {
      const { pixelSize, color, setPixelColor } = parameters;
  
      const startX = x - Math.floor(pixelSize / 2);
      const startY = y - Math.floor(pixelSize / 2);
  
      for (let j = 0; j < pixelSize; j++) {
        for (let i = 0; i < pixelSize; i++) {
          setPixelColor(startX + i, startY + j, color);
        }
      }
    },
  
    eraser: (x, y, parameters) => {
      const { pixelSize, setPixelColor } = parameters;
  
      const startX = x - Math.floor(pixelSize / 2);
      const startY = y - Math.floor(pixelSize / 2);
  
      for (let j = 0; j < pixelSize; j++) {
        for (let i = 0; i < pixelSize; i++) {
          setPixelColor(startX + i, startY + j, null);
        }
      }
    },
  };
  
  export default toolsMap;
  