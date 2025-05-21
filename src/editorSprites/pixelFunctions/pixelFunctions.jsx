/*
AQUI IRAN TODAS LAS FUNCIONES CON LO QUE NECESITAN DE PARAMETROS ETC

*/

export const CustomPaint = (startX, startY, parameters, color, setPixelColor) => {
    // Ahora startX y startY representan la esquina superior izquierda del pincel
    for (let y = startY; y < startY + parameters.pixelSize; y++) {
        for (let x = startX; x < startX + parameters.pixelSize; x++) {
            // setPixelColor ya verifica si está dentro del canvas
            setPixelColor(x, y, parameters.pixelColor);
        }
    }
};

export const CustomErase = (startX, startY, parameters, color, setPixelColor) => {
    // Ahora startX y startY representan la esquina superior izquierda del pincel
    for (let y = startY; y < startY + parameters.pixelSize; y++) {
        for (let x = startX; x < startX + parameters.pixelSize; x++) {
            // setPixelColor ya verifica si está dentro del canvas
            setPixelColor(x, y, color);
        }
    }
};

// CustomSelect function for pixelFunctions.js
export const CustomSelect = (x, y, parameters, _, updateSelectionState) => {
    // Ensure coordinates are valid
    if (x < 0 || y < 0) return;
    
    // Add the pixel to selection
    updateSelectionState(prevSelection => {
      // Create a unique key for this pixel
      const pixelKey = `${x},${y}`;
      
      // If already in selection, don't add it again
      if (prevSelection.has(pixelKey)) {
        return prevSelection;
      }
      
      // Create a new Set to avoid mutating the previous state
      const newSelection = new Set(prevSelection);
      newSelection.add(pixelKey);
      return newSelection;
    });
  };
  
  // Function to start a new selection (clears previous selection)
  export const StartNewSelection = (updateSelectionState) => {
    updateSelectionState(new Set());
  };
  
  // Function to check if a pixel is selected
  export const IsPixelSelected = (x, y, selection) => {
    return selection.has(`${x},${y}`);
  };