// layerRow.jsx — componente compartido para una fila del timeline.
//
// Una fila = layer-info (izquierda: nombre + botones de capa) + timeline-frames
// (derecha: N celdas con estado por-frame). Consumido por:
//   - `layerAnimation.jsx` (panel de LayerAnimation, actualmente con el builder
//     dead pero preparado para re-habilitar).
//   - `timeline.jsx` (FramesTimeline, renderizado activamente).
//
// Diseño:
//   - `React.memo` shallow. Todos los props deben ser primitivos o referencias
//     estables para que el skip funcione.
//   - `handlers` es un bundle con identidad fija (latest-ref pattern en el
//     padre); no rompe la memo aunque cambien los closures subyacentes.
//   - Cambios de `currentFrame` durante playback (60fps) invalidan la memo
//     de CADA fila (es esperado: los flags `isCurrent`/`isActive` cambian).
//     React reconcilia y muta solo el `className` de las celdas afectadas.
//   - No hay setState durante render ni mutación de refs en render.
//
// Visibility button por celda:
//   - Se renderea solo si `handlers.onToggleFrameVisibility` está presente.
//   - layerAnimation lo pasa → botón visible.
//   - timeline NO lo pasa → botón ausente (matching del comportamiento original).

import React from 'react';
import {
  LuEye,
  LuEyeOff,
  LuChevronDown,
  LuChevronRight,
  LuGroup,
  LuMousePointer,
  LuTrash2,
} from 'react-icons/lu';
import { BsDashCircleDotted } from 'react-icons/bs';

const LayerRow = React.memo(function LayerRow({
  layer,
  isExpanded,
  hasChildren,
  layerGroupsCount,
  layersLength,
  frameNumbers,
  currentFrame,
  activeLayerId,
  editingLayerId,
  editingName,
  selectedFrames,
  selectedPixels,
  framesResume,
  onionSkinEnabled,
  onionSkinSettings,
  handlers,
}) {
  const isGroup = !!layer.isGroupLayer;
  const isLayerActive = activeLayerId === layer.id;
  const isEditing = editingLayerId === layer.id;

  // --- Handlers locales: binding de layer/frameNumber + stopPropagation ---
  const onRowContextMenu = (e) => handlers.onLayerContextMenu(e, layer.id);
  const onRowClick = () => handlers.onLayerClick(layer.id);
  const onNameDoubleClick = (e) => handlers.onStartEditing(layer, e);
  const onNameInputChange = (e) => handlers.onEditingNameChange(e.target.value);
  const onNameInputKeyDown = (e) => handlers.onLayerKeyDown(e);
  const onNameInputClick = (e) => e.stopPropagation();
  const onExpandClick = (e) => {
    e.stopPropagation();
    handlers.onToggleExpand(layer.id);
  };
  const onSelectContentClick = (e) => {
    e.stopPropagation();
    handlers.onSelectContent(layer.id);
  };
  const onToggleGroupCreateClick = (e) => {
    e.stopPropagation();
    handlers.onToggleGroupCreate(layer.id);
  };
  const onToggleLayerVisibilityClick = (e) => {
    e.stopPropagation();
    handlers.onToggleLayerVisibility(layer.id);
  };
  const onDeleteLayerClick = (e) => {
    e.stopPropagation();
    handlers.onDeleteLayer(layer);
  };

  const layerInfoClass =
    `layer-info ${layer.visible ? 'visible' : 'hidden'}` +
    ` ${isLayerActive ? 'selected' : ''}`;
  const groupCreateDisabled = !selectedPixels?.length;
  const deleteDisabled = !isGroup && layersLength <= 1;
  const showCellVisibilityButton = typeof handlers.onToggleFrameVisibility === 'function';

  return (
    <div className={`animation-layer-row ${isGroup ? 'group-layer' : ''}`}>
      {/* --- Parte izquierda: info de la capa / grupo --- */}
      <div
        onContextMenu={onRowContextMenu}
        className={layerInfoClass}
        style={{ paddingLeft: '0px' }}
        onClick={onRowClick}
      >
        <div className="layer-content">
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={onNameInputChange}
              onBlur={handlers.onSaveLayerName}
              onKeyDown={onNameInputKeyDown}
              autoFocus
              className="layer-name-input"
              onClick={onNameInputClick}
            />
          ) : (
            <div
              className="layer-name"
              onDoubleClick={onNameDoubleClick}
              title="Doble clic para editar"
            >
              {isGroup ? (
                <>
                  <LuGroup className="group-icon" />
                  {layer.name}
                </>
              ) : (
                <>
                  {layer.name}
                  {layerGroupsCount > 0 && (
                    <span className="group-count">({layerGroupsCount})</span>
                  )}
                </>
              )}
            </div>
          )}

          {hasChildren && (
            <button
              className="expand-toggle"
              onClick={onExpandClick}
              title={isExpanded ? 'Colapsar' : 'Expandir'}
            >
              {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
            </button>
          )}
        </div>

        <div className="layer-actions">
          <button
            onClick={onSelectContentClick}
            title={isGroup ? 'Seleccionar grupo' : 'Seleccionar contenido de la capa'}
            className="layer-btn select-content-btn"
          >
            <LuMousePointer />
          </button>

          {!isGroup && (
            <button
              onClick={onToggleGroupCreateClick}
              title="Crear grupo"
              className={`layer-btn ${selectedPixels?.length ? 'has-selection' : ''}`}
              disabled={groupCreateDisabled}
            >
              <LuGroup />
            </button>
          )}

          <button
            onClick={onToggleLayerVisibilityClick}
            title={layer.visible ? 'Ocultar' : 'Mostrar'}
            className="layer-btn"
          >
            {layer.visible ? <LuEye /> : <LuEyeOff />}
          </button>

          <button
            onClick={onDeleteLayerClick}
            title="Eliminar"
            className="layer-btn delete-btn"
            disabled={deleteDisabled}
          >
            <LuTrash2 />
          </button>

          <button><BsDashCircleDotted /></button>
        </div>
      </div>

      {/* --- Parte derecha: celdas del timeline para esta capa --- */}
      <div className="timeline-frames">
        {frameNumbers.map((frameNumber) => {
          const resolvedFrame = framesResume?.computed?.resolvedFrames?.[frameNumber];
          const directFrame = framesResume?.frames?.[frameNumber];
          const frameData = resolvedFrame || directFrame;

          const isEmpty = !(frameData?.layerHasContent?.[layer.id] ?? false);
          const isVisibleInFrame = frameData?.layerVisibility?.[layer.id] ?? true;
          const hasGroups = !!directFrame?.pixelGroups?.[layer.id] &&
            Object.keys(directFrame.pixelGroups[layer.id]).length > 0;
          const layerOpacity = frameData?.layerOpacity?.[layer.id] ?? 1.0;

          const isCurrent = currentFrame === frameNumber;
          const isActive = isLayerActive && isCurrent;
          const isSelectedGlobal = selectedFrames.includes(frameNumber);
          const isSelectedInActiveLayer = isSelectedGlobal && isLayerActive;
          const isKeyframe =
            framesResume?.computed?.keyframes?.[layer.id]?.includes(frameNumber) ?? false;

          const showOnionOverlay =
            onionSkinEnabled &&
            isLayerActive &&
            currentFrame !== frameNumber &&
            (
              (frameNumber < currentFrame &&
                currentFrame - frameNumber <= onionSkinSettings.previousFrames) ||
              (frameNumber > currentFrame &&
                frameNumber - currentFrame <= onionSkinSettings.nextFrames)
            );

          const className =
            `timeline-frame ${isGroup ? 'group-frame' : ''}` +
            ` ${isEmpty && !hasGroups ? 'empty' : 'filled'}` +
            ` ${isVisibleInFrame ? 'visible' : 'hidden'}` +
            ` ${isSelectedInActiveLayer ? 'current selected-frame' : ''}` +
            ` ${isActive ? 'active' : ''}` +
            ` ${isKeyframe ? 'keyframe' : ''}`;

          // Convenio del parent: frameIndex = frameNumber - 1 en mouseDown.
          const onCellContextMenu = (e) => {
            handlers.onFrameContextMenu(e, 'frame');
            if (!isSelectedInActiveLayer) {
              handlers.onFrameMouseDown(layer.id, frameNumber - 1, e);
            }
          };
          const onCellClick = (e) => e.stopPropagation();
          const onCellMouseDown = (e) => {
            // Guarda: right-click con selección múltiple no re-selecciona
            // (el contextmenu maneja la acción).
            if (e.button === 2 && selectedFrames.length > 1) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            handlers.onFrameMouseDown(layer.id, frameNumber - 1, e);
          };
          const onCellMouseEnter = () => handlers.onFrameMouseEnter(frameNumber);
          const onCellToggleVisibility = showCellVisibilityButton
            ? (e) => {
                e.stopPropagation();
                handlers.onToggleFrameVisibility(layer.id, frameNumber);
              }
            : null;

          return (
            <div
              key={`${layer.id}_frame_${frameNumber}`}
              onContextMenu={onCellContextMenu}
              className={className}
              style={{ opacity: isVisibleInFrame ? layerOpacity : 0.3 }}
              onClick={onCellClick}
              onMouseDown={onCellMouseDown}
              onMouseEnter={onCellMouseEnter}
              title={`Frame ${frameNumber} - ${isEmpty && !hasGroups ? 'Vacío' : 'Con contenido'}${isKeyframe ? ' (Keyframe)' : ''}`}
            >
              <div className="frame-content">
                {isEmpty && !hasGroups ? (
                  <div className="empty-indicator" />
                ) : (
                  <div className="filled-indicator">
                    {hasGroups && <div className="groups-indicator" />}
                    {isKeyframe && <div className="keyframe-indicator" />}
                  </div>
                )}
              </div>

              {isSelectedInActiveLayer && <div className="frame-selection-indicator" />}

              {showOnionOverlay && (
                <div className="onion-skin">
                  <p>{frameNumber}</p>
                </div>
              )}

              {showCellVisibilityButton && (
                <button
                  className="frame-visibility-btn"
                  onClick={onCellToggleVisibility}
                  title={isVisibleInFrame ? 'Ocultar frame' : 'Mostrar frame'}
                >
                  {isVisibleInFrame ? <LuEye size={12} /> : <LuEyeOff size={12} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default LayerRow;

// FrameNumberCell — celda del strip de números de frame (header del timeline).
// Hoisted + memoizada por los mismos motivos que LayerRow: evitar remontar
// TODAS las celdas en cada render del padre. Se usa tanto en layerAnimation
// (si se re-habilita ahí) como en timeline.jsx (header row del grid).
export const FrameNumberCell = React.memo(function FrameNumberCell({
  frameNumber,
  isCurrent,
  isSelected,
  onMouseDown,
  onMouseEnter,
}) {
  const handleMouseDown = (e) => onMouseDown(frameNumber, e);
  const handleMouseEnter = () => onMouseEnter(frameNumber);
  return (
    <div
      className={`frame-number ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      style={{ userSelect: 'none' }}
      title={`Frame ${frameNumber}\nArrastrar para seleccionar múltiples`}
    >
      {frameNumber}
      {isSelected && !isCurrent && <div className="selection-indicator" />}
    </div>
  );
});

