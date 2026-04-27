// layerRow.jsx — componente compartido para una fila del timeline.
//
// Una fila = layer-info (izquierda: nombre + botones de capa) + timeline-frames
// (derecha: N celdas con estado por-frame). Consumido por:
//   - `layerAnimation.jsx` (panel de LayerAnimation, actualmente con el builder
//     dead pero preparado para re-habilitar).
//   - `timeline.jsx` (FramesTimeline, renderizado activamente).
//
// Diseño:
//   - `React.memo` con COMPARADOR CUSTOM (ver `arePropsEqual` abajo). El
//     shallow memo no era suficiente: `framesResume` recibe un ref nuevo en
//     cada pincelada (Immer `produce()` genera nuevo root ref por structural
//     sharing), lo que haría re-renderear TODAS las capas aunque solo una
//     cambió. El comparador revisa únicamente la SLICE específica de esta
//     capa (layerHasContent[id], layerVisibility[id], layerOpacity[id],
//     pixelGroups[id], keyframes[id]). Resultado: pintar en capa A no
//     re-renderea capa B, C, D...
//   - `handlers` es un bundle con identidad fija (latest-ref pattern en el
//     padre); se compara por referencia (siempre estable).
//   - Cambios de `currentFrame` invalidan la memo de CADA fila (esperado: los
//     flags `isCurrent`/`isActive` cambian). React reconcilia y muta solo el
//     `className` de las 2 celdas afectadas. Durante playback puro,
//     `currentFrame` NO cambia (solo cambia `animationTickFrame`, que solo
//     recibe el header) → las LayerRow se quedan estables.
//   - No hay setState durante render ni mutación de refs en render.
//
// Visibility button por celda:
//   - Se renderea solo si `handlers.onToggleFrameVisibility` está presente.
//   - layerAnimation lo pasa → botón visible.
//   - timeline NO lo pasa → botón ausente (matching del comportamiento original).

import React, { useState, useRef } from 'react';
import {
  LuEye,
  LuEyeOff,
  LuChevronDown,
  LuChevronRight,
  LuGroup,
  LuMousePointer,
  LuTrash2,
  LuLayers,
} from 'react-icons/lu';
import { BsDashCircleDotted } from 'react-icons/bs';
import { BlendModePopover } from './blendModePopover';
import { getBlendModeLabel } from '../blendModes';

// Comparador custom: `true` = skip re-render, `false` = re-render.
//
// Orden de checks: primero los props escalares/ref-baratos (fast-path), luego
// la inspección por-capa de `framesResume`. Cualquier check que devuelva
// `false` corta la comparación.
function arePropsEqual(prev, next) {
  // --- 1. Refs / escalares simples ---
  if (
    prev.layer !== next.layer ||
    prev.isExpanded !== next.isExpanded ||
    prev.hasChildren !== next.hasChildren ||
    prev.layerGroupsCount !== next.layerGroupsCount ||
    prev.layersLength !== next.layersLength ||
    prev.currentFrame !== next.currentFrame ||
    prev.selectedFrames !== next.selectedFrames ||
    prev.selectedPixels !== next.selectedPixels ||
    prev.onionSkinEnabled !== next.onionSkinEnabled ||
    prev.onionSkinSettings !== next.onionSkinSettings ||
    prev.handlers !== next.handlers
  ) {
    return false;
  }

  // --- 1b. frameNumbers: ref cambia en cada pincelada (useMemo invalidado
  //         por framesResume), pero las KEYS casi nunca cambian. Comparar por
  //         contenido: si el conjunto de frames es el mismo, no re-renderear
  //         por este motivo. ---
  if (prev.frameNumbers !== next.frameNumbers) {
    if (prev.frameNumbers.length !== next.frameNumbers.length) return false;
    for (let i = 0; i < prev.frameNumbers.length; i++) {
      if (prev.frameNumbers[i] !== next.frameNumbers[i]) return false;
    }
  }

  const layerId = next.layer.id;

  // --- 2. activeLayerId: solo importa si ESTA capa ganó o perdió el foco ---
  if (prev.activeLayerId !== next.activeLayerId) {
    if (prev.activeLayerId === layerId || next.activeLayerId === layerId) {
      return false;
    }
  }

  // --- 3. editingLayerId / editingName: solo importa si esta capa es la que
  //     se está editando (pasada o presente) ---
  if (prev.editingLayerId !== next.editingLayerId) {
    if (prev.editingLayerId === layerId || next.editingLayerId === layerId) {
      return false;
    }
  }
  if (prev.editingName !== next.editingName && next.editingLayerId === layerId) {
    return false;
  }

  // --- 4. framesResume: si ref idéntico, nada cambió ---
  if (prev.framesResume === next.framesResume) return true;

  // --- 5. framesResume cambió: inspeccionar solo la slice de esta capa ---
  const pfFrames = prev.framesResume?.frames;
  const nfFrames = next.framesResume?.frames;
  const pResolved = prev.framesResume?.computed?.resolvedFrames;
  const nResolved = next.framesResume?.computed?.resolvedFrames;

  // Keyframes por capa: Immer comparte el mismo array ref cuando no se mutó
  const pk = prev.framesResume?.computed?.keyframes?.[layerId];
  const nk = next.framesResume?.computed?.keyframes?.[layerId];
  if (pk !== nk) return false;

  // Para cada frame visible, comparar la slice de esta capa. Aprovechamos
  // structural sharing: si `frames[fn]` mantiene el ref, todos sus layers lo
  // hacen también; solo entramos al check granular cuando el frame cambió.
  const frames = next.frameNumbers;
  for (let i = 0; i < frames.length; i++) {
    const fn = frames[i];
    const pf = pfFrames?.[fn];
    const nf = nfFrames?.[fn];
    if (pf !== nf) {
      if (
        pf?.layerHasContent?.[layerId] !== nf?.layerHasContent?.[layerId] ||
        pf?.layerVisibility?.[layerId] !== nf?.layerVisibility?.[layerId] ||
        pf?.layerOpacity?.[layerId] !== nf?.layerOpacity?.[layerId] ||
        pf?.pixelGroups?.[layerId] !== nf?.pixelGroups?.[layerId]
      ) {
        return false;
      }
    }
    const prf = pResolved?.[fn];
    const nrf = nResolved?.[fn];
    if (prf !== nrf) {
      if (
        prf?.layerHasContent?.[layerId] !== nrf?.layerHasContent?.[layerId] ||
        prf?.layerVisibility?.[layerId] !== nrf?.layerVisibility?.[layerId] ||
        prf?.layerOpacity?.[layerId] !== nrf?.layerOpacity?.[layerId]
      ) {
        return false;
      }
    }
  }

  return true; // La slice de esta capa no cambió → skip render
}

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

  // Blend mode popover: state local + ref al boton para anclar el popover.
  const [blendPickerOpen, setBlendPickerOpen] = useState(false);
  const blendBtnRef = useRef(null);
  const currentBlendMode = layer.blendMode ?? 'normal';
  const onBlendBtnClick = (e) => {
    e.stopPropagation();
    setBlendPickerOpen(prev => !prev);
  };
  const onBlendPick = (modeId) => {
    if (typeof handlers.onSetLayerBlendMode === 'function') {
      handlers.onSetLayerBlendMode(layer.id, modeId);
    }
  };
  const onBlendCancel = (originalMode) => {
    if (typeof handlers.onSetLayerBlendMode === 'function' && originalMode != null) {
      handlers.onSetLayerBlendMode(layer.id, originalMode);
    }
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
            ref={blendBtnRef}
            onClick={onBlendBtnClick}
            title={`Modo de fusión: ${getBlendModeLabel(currentBlendMode)}`}
            className={`layer-btn blend-mode-btn ${currentBlendMode !== 'normal' ? 'has-blend' : ''} ${blendPickerOpen ? 'open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={blendPickerOpen}
          >
            <LuLayers />
          </button>

          <button
            onClick={onDeleteLayerClick}
            title="Eliminar"
            className="layer-btn delete-btn"
            disabled={deleteDisabled}
          >
            <LuTrash2 />
          </button>

          {blendPickerOpen && (
            <BlendModePopover
              anchorEl={blendBtnRef.current}
              currentMode={currentBlendMode}
              onPick={onBlendPick}
              onClose={() => setBlendPickerOpen(false)}
              onCancel={onBlendCancel}
            />
          )}

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

          // Visual de seleccion:
          //  - `selected-frame`  → toda capa cuya celda este en selectedFrames
          //    (asi el usuario ve consistentemente que frames estan
          //    seleccionados al arrastrar entre filas).
          //  - `current`         → reservado para la celda activa de la capa
          //    activa (frame "actual" del editor).
          //  - `selected-frame--active-layer` → acento extra en la capa
          //    activa, para distinguirla del resto de capas que comparten la
          //    misma seleccion global de frames.
          const className =
            `timeline-frame ${isGroup ? 'group-frame' : ''}` +
            ` ${isEmpty && !hasGroups ? 'empty' : 'filled'}` +
            ` ${isVisibleInFrame ? 'visible' : 'hidden'}` +
            ` ${isSelectedGlobal ? 'selected-frame' : ''}` +
            ` ${isSelectedInActiveLayer ? 'current selected-frame--active-layer' : ''}` +
            ` ${isActive ? 'active' : ''}` +
            ` ${isKeyframe ? 'keyframe' : ''}`;

          // Convenio del parent: frameIndex = frameNumber - 1 en mouseDown.
          //
          // Right-click sobre un frame YA seleccionado (en cualquier capa o
          // multi-seleccion): NO tocar la seleccion — el menu actua sobre
          // todos los frames seleccionados. Antes el contextmenu re-llamaba
          // onFrameMouseDown si la capa no era la activa, lo cual reseteaba
          // toda la seleccion al frame clickeado.
          const onCellContextMenu = (e) => {
            handlers.onFrameContextMenu(e, 'frame');
            if (!isSelectedGlobal) {
              // Frame fuera de la seleccion: lo seleccionamos para que el
              // menu tenga un blanco coherente.
              handlers.onFrameMouseDown(layer.id, frameNumber - 1, e);
            }
          };
          const onCellClick = (e) => e.stopPropagation();
          const onCellMouseDown = (e) => {
            // Right-click sobre un frame YA seleccionado: short-circuit para
            // que el handler del onClick original no resetee la seleccion.
            // El contextmenu (arriba) decide solo si reemplazar la seleccion
            // o preservarla, segun isSelectedGlobal.
            if (e.button === 2 && isSelectedGlobal) {
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
}, arePropsEqual);

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
  onContextMenu,
}) {
  const handleMouseDown = (e) => onMouseDown(frameNumber, e);
  const handleMouseEnter = () => onMouseEnter(frameNumber);
  return (
    <div
      className={`frame-number ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onContextMenu={onContextMenu}
      style={{ userSelect: 'none' }}
      title={`Frame ${frameNumber}\nArrastrar para seleccionar múltiples`}
    >
      {frameNumber}
      {isSelected && !isCurrent && <div className="selection-indicator" />}
    </div>
  );
});

