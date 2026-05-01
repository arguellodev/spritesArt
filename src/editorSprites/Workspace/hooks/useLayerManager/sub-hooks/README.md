# `sub-hooks/`

Hooks que **poseen estado + efectos propios**. Se invocan desde `../index.jsx` en orden estricto. Cada uno devuelve una API que `index.jsx` compone en el objeto público de `useLayerManager`.

Regla: si una concern no posee estado, **no** va aquí — va a `../actions/` como factory. Sólo extraemos a sub-hook cuando hay `useState` o `useEffect` propios.

## Mapa de archivos

| Archivo | Estado que posee | Qué devuelve |
|---|---|---|
| `useUndoRedo.js` | `history`, `currentIndex`, `pixelChangesStack`, `pixelChangesIndex`, `isRestoringRef` (único en todo el hook), `previousFramesResumeRef` | `logPixelChanges`, `undo`, `redo`, `undoPixelChanges`, `redoPixelChanges`, `undoFrames`, `redoFrames`, `canUndo*`, `canRedo*`, `clearAllHistory`, `getCompleteDebugInfo`, `getChangePreview`, `historyPush`, `savePixelChangesToStack` (interno), y el propio `isRestoringRef` para pasárselo a actions. |
| `useOnionSkin.js` | `onionSkinEnabled`, `onionSkinSettings`, `onionFramesConfig`, `onionSkinActiveLayerId` (filtro por capa), `tintedCanvasCache` (ref) | `toggleOnionSkin`, `setOnionSkinConfig`, `setOnionSkinFrameConfig`, `getOnionSkinFrameConfig`, `addPreviousFrame`, `addNextFrame`, `removeFrame`, `updateFrameConfig`, `updatePreviousFrameConfig`, `updateNextFrameConfig`, `toggleOnionFrames`, `applyOnionFramesPreset`, `getOnionSkinPresets`, `setOnionSkinActiveLayer`, `clearOnionSkinLayerFilter`, `shouldShowLayerInOnionSkin`, `clearTintCache`. |
| `usePixelGroups.js` | `pixelGroups` (mapa por layerId), `selectedGroup` | `createPixelGroup`, `deletePixelGroup`, `getLayerGroups`, `getAllGroups`, `getPixelGroupAt`, `isPixelInGroup`, `selectPixelGroup`, `clearSelectedGroup`, `renamePixelGroup`, `toggleGroupVisibility`, `updatePixelGroup`, `moveGroupUp/Down/ToTop/ToBottom`, `getGroupsAtPosition`, `getTopGroupAt`, `renderGroupOverlays(ctx)`, `renderHierarchicalGroupOverlay`, `getHierarchyInfoAt`, `cycleGroupSelectionAt`, `syncWithCurrentFrame`. |
| `useIsolationMask.js` | `isolationMaskCache` (ref), `currentIsolationHash` (ref) | `updateIsolationMask(isolatedPixels)`, `renderCachedIsolationMask(ctx)`, `clearIsolationMaskCache`, `generateIsolationHash`. |
| `useLighterMode.js` | `tempLighterCanvas` (state), `tempLighterLayerId`, `lastModifiedLayer` (ref) | `createTempLighterCanvas(layerId, frameId)`, `clearTempLighterCanvas`, `mergeTempLighterCanvas`, `forceMergeLighterCanvas`, `getLighterInfo`. |

## Convenciones

- **No duplicar estado del padre.** Si un sub-hook necesita `layers` o `frames`, los recibe como argumento. Nunca los vuelve a declarar con `useState`.
- **Efectos idempotentes.** Cada `useEffect` dentro de un sub-hook debe asumir que puede correr dos veces en dev (`StrictMode`) sin side effects destructivos.
- **Console logs.** Los que ya existen en el archivo original se preservan tal cual durante la refactorización — son parte del comportamiento observado.
- **Nombrado.** Archivos con prefijo `use*`. Exportación por defecto = la función del hook; exports nombrados adicionales si hace falta exponer tipos/constantes.
