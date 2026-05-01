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
  deleteSelection,
}) => {
  // Estados para las configuraciones de la herramienta de selección
  const [selectionMode, setSelectionMode] = useState('rectangle');
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(false);
  const [featherRadius, setFeatherRadius] = useState(0);
  const [antialiasing, setAntialiasing] = useState(true);

  // useEffect para cargar configuración guardada. Verificamos truthy en
  // lugar de `!== null` porque el valor inicial de toolConfigs[X] es null,
  // y para `antialiasing` usamos coalescencia (??) para no perder `false`.
  useEffect(() => {
    const selectConfig = toolConfigs.select;
    if (selectConfig) {
      setSelectionMode(selectConfig.selectionMode || 'rectangle');
      setPreserveAspectRatio(selectConfig.preserveAspectRatio ?? false);
      setFeatherRadius(selectConfig.featherRadius ?? 0);
      setAntialiasing(selectConfig.antialiasing ?? true);
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
            type="button"
            className="action-button"
            onClick={() => handleAction('copy', copySelection)}
            title="Copiar selección (Ctrl+C)"
            aria-label="Copiar selección"
          >
            <LuCopy />
          </button>
        </div>

        <div className="config-item">
          <button
            type="button"
            className="action-button"
            onClick={() => handleAction('cut', cutSelection)}
            title="Cortar selección (Ctrl+X)"
            aria-label="Cortar selección"
          >
            <LuScissors />
          </button>
        </div>

        <div className="config-item">
          <button
            type="button"
            className="action-button"
            onClick={() => handleAction('paste', pastePixels)}
            title="Pegar (Ctrl+V)"
            aria-label="Pegar"
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
            type="button"
            className="action-button"
            onClick={() => handleAction('duplicate', duplicateSelection)}
            title="Duplicar selección"
            aria-label="Duplicar selección"
          >
            <LuCopyPlus />
          </button>
        </div>

        <div className="config-item">
          <button
            type="button"
            className="action-button"
            onClick={() => handleAction('rotateLeft', () => handleRotation?.('left'))}
            title="Rotar 90° izquierda"
            aria-label="Rotar 90 grados a la izquierda"
          >
            <LuRotateCcw />
          </button>
        </div>

        <div className="config-item">
          <button
            type="button"
            className="action-button"
            onClick={() => handleAction('rotateRight', () => handleRotation?.('right'))}
            title="Rotar 90° derecha"
            aria-label="Rotar 90 grados a la derecha"
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
            type="button"
            className="action-button"
            onClick={() => handleAction('fill', fillSelection)}
            title="Rellenar con color actual"
            aria-label="Rellenar selección con color actual"
          >
            <LuPaintBucket />
          </button>
        </div>

        <div className="config-item">
          <button
            type="button"
            className="action-button"
            onClick={() => handleAction('isolate', isolateSelection)}
            title="Aislar selección"
            aria-label="Aislar selección"
          >
            <LuMove />
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
            type="button"
            className="action-button"
            onClick={() => handleAction('group', groupSelection)}
            title="Agrupar selección"
            aria-label="Agrupar selección"
          >
            <LuGroup />
          </button>
        </div>

        <div className="config-item">
          <button
            type="button"
            className="action-button"
            onClick={() => handleAction('ungroup', ungroupSelection)}
            title="Desagrupar selección"
            aria-label="Desagrupar selección"
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
            type="button"
            className="action-button delete-button"
            onClick={() => handleAction('delete', deleteSelection)}
            title="Eliminar selección (Delete)"
            aria-label="Eliminar selección"
          >
            <LuTrash2 />
          </button>
        </div>

      </div>
    </div>
  );
};

export default SelectTool;