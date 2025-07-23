import React, { useEffect, useState } from 'react';
import CustomSelect from '../customSelect';

const BrushSelect = ({ 
  brushTypes, 
  selectedBrushType, 
  onBrushTypeChange, 
  toolParameters,
  myBrushes 
}) => {
  
  // Estado local para manejar el item seleccionado
  const [selectedItem, setSelectedItem] = useState(null);

  // Función para obtener el color de preview de un píxel
  const getPreviewPixelColor = (pixel, brushType) => {
    if (brushType.useCurrentColor && pixel.color === null) {
      // Usar el color del sistema para el preview
      const currentColor = toolParameters?.foregroundColor || { r: 100, g: 100, b: 100, a: 1 };
      const opacity = pixel.opacity || 1;
      return `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${opacity})`;
    }
    
    if (pixel.color) {
      return `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a / 255})`;
    }
    
    return 'transparent';
  };

  // Función para renderizar el preview de una brocha
  const renderBrushPreview = (brushType) => {
    if (!brushType.customBrush) {
      // Preview para brocha estándar
      return (
        <div className="brush-preview">
          <div 
            className="brush-preview-standard"
            style={{ 
              backgroundColor: toolParameters?.foregroundColor ? 
                `rgba(${toolParameters.foregroundColor.r}, ${toolParameters.foregroundColor.g}, ${toolParameters.foregroundColor.b}, ${toolParameters.foregroundColor.a*100})` :
                'rgba(100, 100, 100, 1)'
            }}
          />
        </div>
      );
    }

    // Calcular el tamaño de la grilla basado en los datos de la brocha
    const pixels = brushType.data;
    const minX = Math.min(...pixels.map(p => p.x));
    const maxX = Math.max(...pixels.map(p => p.x));
    const minY = Math.min(...pixels.map(p => p.y));
    const maxY = Math.max(...pixels.map(p => p.y));
    
    const gridWidth = maxX - minX + 1;
    const gridHeight = maxY - minY + 1;
    const maxSize = Math.max(gridWidth, gridHeight);
    
    // Crear una grilla cuadrada
    const gridSize = Math.max(3, maxSize);
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    
    // Crear array para la grilla
    const grid = Array(gridSize * gridSize).fill(null);
    
    // Llenar la grilla con los píxeles de la brocha
    pixels.forEach(pixel => {
      const gridX = centerX + pixel.x;
      const gridY = centerY + pixel.y;
      
      if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
        const index = gridY * gridSize + gridX;
        grid[index] = pixel;
      }
    });

    return (
      <div className="brush-preview">
        <div 
          className="brush-preview-grid"
          style={{ 
            '--grid-size': gridSize,
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`
          }}
        >
          {grid.map((pixel, index) => (
            <div
              key={index}
              className="brush-preview-pixel"
              style={{
                backgroundColor: pixel ? getPreviewPixelColor(pixel, brushType) : 'transparent'
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Función para renderizar cada opción del select
  const renderOption = (item) => {
    const brushType = item.brushData; // Asumimos que pasamos brushData en cada item
    
    return (
      <div className="brush-preview-container">
        {renderBrushPreview(brushType)}
        <div className="brush-info">
          <div className="brush-name">
            {brushType.name}
            {brushType.isMyBrush && <span className="my-brush-badge">👤</span>}
          </div>
          <div className="brush-description">
            {brushType.customBrush ? 
              `${brushType.isMyBrush ? 'My brush' : 'Custom'} ${brushType.data.length} pixels` : 
              'Standard brush'
            }
          </div>
        </div>
      </div>
    );
  };

  // Función para renderizar la opción seleccionada
  const renderSelected = (item) => {
    const brushType = item.brushData;
    
    return (
      <div className="brush-preview-container">
        {renderBrushPreview(brushType)}
        <div className="brush-info">
          <div className="brush-name">
            {brushType.name}
            {brushType.isMyBrush && <span className="my-brush-badge">👤</span>}
          </div>
        </div>
      </div>
    );
  };

  // Convertir brushTypes a formato de options para CustomSelect
  const createSelectOptions = () => {
    const options = {};
    
    // Standard Brushes
    const standardBrushes = Object.entries(brushTypes)
      .filter(([key, brush]) => !brush.customBrush)
      .map(([key, brush]) => ({
        value: key,
        label: brush.name,
        brushData: brush
      }));
    
    if (standardBrushes.length > 0) {
      options["Standard Brushes"] = standardBrushes;
    }

    // Predefined Custom Brushes
    const predefinedBrushes = Object.entries(brushTypes)
      .filter(([key, brush]) => brush.customBrush && !brush.isMyBrush)
      .map(([key, brush]) => ({
        value: key,
        label: brush.name,
        brushData: brush
      }));
    
    if (predefinedBrushes.length > 0) {
      options["Custom Brushes"] = predefinedBrushes;
    }

    // My Brushes - Solo agregar si existen
    const myBrushOptions = Object.entries(brushTypes)
      .filter(([key, brush]) => brush.customBrush && brush.isMyBrush)
      .map(([key, brush]) => ({
        value: key,
        label: brush.name,
        brushData: brush
      }));
    
    if (myBrushOptions.length > 0) {
      options["My Brushes"] = myBrushOptions;
    }

    return options;
  };

  const selectOptions = createSelectOptions();

  // useEffect para actualizar el selectedItem cuando cambie selectedBrushType
  useEffect(() => {
    const newSelectedItem = Object.entries(brushTypes)
      .map(([key, brush]) => ({
        value: key,
        label: brush.name,
        brushData: brush
      }))
      .find(item => item.value === selectedBrushType);
    
    setSelectedItem(newSelectedItem || null);
  }, [selectedBrushType, brushTypes]);

  // Manejar selección
  const handleSelect = (item) => {
    setSelectedItem(item);
    onBrushTypeChange({ target: { value: item.value } });
  };

  return (
    <div className="config-item">
      <label className="tool-label">Brush Type</label>
      <CustomSelect
        position="bottom"          // "top", "bottom", "left", "right"
        maxHeight="500px"         // Altura máxima del menú
        enableColumns={true}      // Habilitar columnas automáticas
        minColumnWidth="100px"
        
        options={selectOptions}
        placeholder="Select a brush..."
        onSelect={handleSelect}
        value={selectedItem}      // Usar value en lugar de defaultValue
        
        renderOption={renderOption}
        renderSelected={renderSelected}
      />
    </div>
  );
};

export default BrushSelect;