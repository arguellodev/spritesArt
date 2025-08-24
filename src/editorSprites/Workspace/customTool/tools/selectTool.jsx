import { useEffect, useState } from "react";
import { 
  LuCopy, 
  LuScissors, 
  LuClipboard, 
  LuTrash2, 
  LuRotateCw, 
  LuRotateCcw,
  LuCopyPlus,
  LuPaintBucket,

  LuGroup,
  LuUngroup,
  LuMove
} from "react-icons/lu";

const SelectTool = ({ 
  setToolParameters, 
  tool, 
  toolParameters, 
  toolConfigs, 
  setToolConfigs,
  // Props específicas para las acciones de selección
  copySelection,
  cutSelection,
  pastePixels,
  duplicateSelection,
  handleRotation,
  fillSelection,
  isolateSelection,
  groupSelection,
  ungroupSelection,
  deleteSelection
}) => {
  // Estados para las configuraciones de la herramienta de selección
  const [selectionMode, setSelectionMode] = useState('rectangle');
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(false);
  const [featherRadius, setFeatherRadius] = useState(0);
  const [antialiasing, setAntialiasing] = useState(true);

  // useEffect para cargar configuración guardada
  useEffect(() => {
    const selectConfig = toolConfigs.select;
    
    if (selectConfig !== null) {
      setSelectionMode(selectConfig.selectionMode || 'rectangle');
      setPreserveAspectRatio(selectConfig.preserveAspectRatio || false);
      setFeatherRadius(selectConfig.featherRadius || 0);
      setAntialiasing(selectConfig.antialiasing || true);
    }
  }, []);

  // useEffect para guardar cambios en la configuración
  useEffect(() => {
    const currentConfig = {
      selectionMode,
      preserveAspectRatio,
      featherRadius,
      antialiasing
    };

    setToolConfigs(prev => ({
      ...prev,
      select: currentConfig
    }));
  }, [selectionMode, preserveAspectRatio, featherRadius, antialiasing, setToolConfigs]);

  // useEffect para actualizar parámetros de herramienta
  useEffect(() => {
    setToolParameters(prev => ({
      ...prev,
      selectionMode,
      preserveAspectRatio,
      featherRadius,
      antialiasing
    }));
  }, [selectionMode, preserveAspectRatio, featherRadius, antialiasing, setToolParameters]);

  // Función para manejar acciones con verificación
  const handleAction = (actionName, actionFunction) => {
    if (typeof actionFunction === 'function') {
      actionFunction();
    } else {
      console.warn(`Acción ${actionName} no está disponible`);
    }
  };

  // Función para manejar el cambio de featherRadius
  const handleFeatherRadiusChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFeatherRadius('');
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setFeatherRadius(Math.max(0, Math.min(50, numValue)));
    }
  };

  const handleFeatherRadiusBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseInt(value))) {
      setFeatherRadius(0);
    }
  };

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        


        {/* Separador visual */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: 'var(--border-color)', 
          margin: '0 8px' 
        }}></div>

        {/* Acciones de selección - Grupo 1: Portapapeles */}
        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('copy', copySelection)}
            title="Copiar selección (Ctrl+C)"
          >
            <LuCopy />
          </button>
        </div>

        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('cut', cutSelection)}
            title="Cortar selección (Ctrl+X)"
          >
            <LuScissors />
          </button>
        </div>

        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('paste', pastePixels)}
            title="Pegar (Ctrl+V)"
          >
            <LuClipboard />
          </button>
        </div>

        {/* Separador */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: 'var(--border-color)', 
          margin: '0 4px' 
        }}></div>

        {/* Grupo 2: Transformaciones */}
        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('duplicate', duplicateSelection)}
            title="Duplicar selección"
          >
            <LuCopyPlus />
          </button>
        </div>

        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('rotateLeft', () => handleRotation?.('left'))}
            title="Rotar 90° izquierda"
          >
            <LuRotateCcw />
          </button>
        </div>

        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('rotateRight', () => handleRotation?.('right'))}
            title="Rotar 90° derecha"
          >
            <LuRotateCw />
          </button>
        </div>

        {/* Separador */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: 'var(--border-color)', 
          margin: '0 4px' 
        }}></div>

        {/* Grupo 3: Modificación */}
        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('fill', fillSelection)}
            title="Rellenar con color actual"
          >
            <LuPaintBucket />
          </button>
        </div>

        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('isolate', isolateSelection)}
            title="Aislar selección"
          >
            
          </button>
        </div>

        {/* Separador */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: 'var(--border-color)', 
          margin: '0 4px' 
        }}></div>

        {/* Grupo 4: Grupos */}
        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('group', groupSelection)}
            title="Agrupar selección"
          >
            <LuGroup />
          </button>
        </div>

        <div className="config-item">
          <button
            className="action-button"
            onClick={() => handleAction('ungroup', ungroupSelection)}
            title="Desagrupar selección"
          >
            <LuUngroup />
          </button>
        </div>

        {/* Separador */}
        <div style={{ 
          width: '1px', 
          height: '20px', 
          background: 'var(--border-color)', 
          margin: '0 4px' 
        }}></div>

        {/* Grupo 5: Eliminar */}
        <div className="config-item">
          <button
            className="action-button delete-button"
            onClick={() => handleAction('delete', deleteSelection)}
            title="Eliminar selección (Delete)"
          >
            <LuTrash2 />
          </button>
        </div>

      </div>
    </div>
  );
};

export default SelectTool;