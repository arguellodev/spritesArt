// topMenuConfig — fábrica de los menús desplegables del TopToolbar.
// Mantenemos toda la estructura aquí para que workspaceContainer (12k LOC)
// no crezca más. Recibe handlers y `t` (i18n) y devuelve el array que
// consume <TopToolbar menus={...} />.
//
// Para items que aún no tienen handler funcional, marcamos `disabled: true`
// con un `hint` traducido — preferible a callbacks no-op que confundan
// al usuario.

import {
  LuFile, LuFolderOpen, LuSave, LuLogOut, LuFileInput, LuFileOutput,
  LuUndo, LuRedo, LuScissors, LuCopy, LuCopyPlus, LuTrash2, LuPaintBucket,
  LuRotateCcw, LuRotateCw,
  LuPointerOff, LuFocus, LuLogIn, LuGroup, LuUngroup, LuCrop,
  LuRuler, LuLayers, LuMaximize2, LuType, LuBrackets, LuFilter,
  LuBrainCircuit, LuBox,
  LuKeyboard, LuLanguages, LuMoon, LuSun,
  LuInfo, LuBookOpen, LuList,
  LuFile as LuFilePlus, LuChevronsRight,
} from 'react-icons/lu';

const sep = () => ({ type: 'separator' });
const header = (name) => ({ type: 'header', name });

/**
 * @param {object} h - handlers ya disponibles en workspaceContainer.
 *   Todos opcionales — si falta uno el item se renderiza disabled.
 * @param {function} t - i18n translator (key => string)
 * @param {object} state - banderas reactivas para `checked`/`disabled`:
 *   { hasSelection, isolated, showRulers, onionSkinEnabled,
 *     isFullscreen, lang, activeAI, threeD }
 */
export function buildTopMenus(h, t, state = {}) {
  const {
    hasSelection = false,
    isolated = false,
    showRulers = false,
    onionSkinEnabled = false,
    isFullscreen = false,
    lang = 'es',
    activeAI = false,
    threeD = false,
  } = state;

  // Helper: mete un onClick "seguro" — si no existe, deshabilita y deja hint.
  const wire = (fn, fallbackHint = t('common.disabled.notImplemented')) =>
    typeof fn === 'function'
      ? { onClick: fn }
      : { disabled: true, hint: fallbackHint };

  const wireSel = (fn) => {
    if (typeof fn !== 'function')
      return { disabled: true, hint: t('common.disabled.notImplemented') };
    if (!hasSelection)
      return { disabled: true, hint: t('common.disabled.requiresSelection') };
    return { onClick: fn };
  };

  return [
    // ── Archivo ─────────────────────────────────────────────
    {
      key: 'file',
      label: t('menu.archivo'),
      items: [
        header(t('file.section.workspace')),
        { name: t('file.new'),  icon: <LuFilePlus />,    ...wire(h.onNewProject),  shortcut: 'Ctrl+N' },
        { name: t('file.open'), icon: <LuFolderOpen />,  ...wire(h.onOpenProject), shortcut: 'Ctrl+O' },
        { name: t('file.save'), icon: <LuSave />,        ...wire(h.onSave),        shortcut: 'Ctrl+S' },
        sep(),
        header(t('file.section.io')),
        {
          name: t('file.import'),
          icon: <LuFileInput />,
          submenu: [
            { name: t('file.import.aseprite'), icon: <LuFile />,        ...wire(h.onImportAseprite) },
            { name: t('file.import.gif'),      icon: <LuFile />,        ...wire(h.onImportGif) },
            { name: t('file.import.image'),    icon: <LuFile />,        ...wire(h.onImportReference) },
          ],
        },
        {
          name: t('file.export'),
          icon: <LuFileOutput />,
          submenu: [
            { name: t('file.export.animation'), icon: <LuFileOutput />, ...wire(h.onExport), shortcut: 'Ctrl+E' },
          ],
        },
        sep(),
        { name: t('file.exit'), icon: <LuLogOut />, ...wire(h.onExit), danger: true },
      ],
    },

    // ── Editar ─────────────────────────────────────────────
    {
      key: 'edit',
      label: t('menu.editar'),
      items: [
        header(t('edit.section.history')),
        { name: t('edit.undo'), icon: <LuUndo />, ...wire(h.onUndo), shortcut: 'Ctrl+Z' },
        { name: t('edit.redo'), icon: <LuRedo />, ...wire(h.onRedo), shortcut: 'Ctrl+Y' },
        sep(),
        header(t('edit.section.clipboard')),
        { name: t('edit.cut'),       icon: <LuScissors />, ...wireSel(h.onCut),       shortcut: 'Ctrl+X' },
        { name: t('edit.copy'),      icon: <LuCopy />,     ...wireSel(h.onCopy),      shortcut: 'Ctrl+C' },
        { name: t('edit.duplicate'), icon: <LuCopyPlus />, ...wireSel(h.onDuplicate), shortcut: 'Ctrl+D' },
        { name: t('edit.delete'),    icon: <LuTrash2 />,   ...wireSel(h.onDelete),    shortcut: 'Delete', danger: true },
        { name: t('edit.fill'),      icon: <LuPaintBucket />, ...wireSel(h.onFill) },
        sep(),
        header(t('edit.section.transform')),
        { name: t('edit.rotateLeft'),  icon: <LuRotateCcw />, ...wireSel(() => h.onRotate?.('left')) },
        { name: t('edit.rotateRight'), icon: <LuRotateCw />,  ...wireSel(() => h.onRotate?.('right')) },
      ],
    },

    // ── Selección ──────────────────────────────────────────
    {
      key: 'sel',
      label: t('menu.seleccion'),
      items: [
        { name: t('sel.deselect'),   icon: <LuPointerOff />, ...wireSel(h.onDeselect) },
        sep(),
        { name: t('sel.isolate'),     icon: <LuFocus />,  ...wireSel(h.onIsolate) },
        {
          name: t('sel.exitIsolate'),
          icon: <LuLogIn />,
          ...(isolated ? wire(h.onExitIsolate) : { disabled: true, hint: t('sel.exitIsolate') }),
          danger: isolated,
        },
        sep(),
        { name: t('sel.group'),    icon: <LuGroup />,    ...wireSel(h.onGroup) },
        { name: t('sel.ungroup'),  icon: <LuUngroup />,  ...wireSel(h.onUngroup) },
        sep(),
        { name: t('sel.cropToSelection'), icon: <LuCrop />, ...wire(h.onAutoCrop) },
      ],
    },

    // ── Vista ──────────────────────────────────────────────
    {
      key: 'view',
      label: t('menu.vista'),
      items: [
        header(t('view.section.canvas')),
        {
          name: t('view.rulers'), icon: <LuRuler />,
          ...wire(h.onToggleRulers), checked: showRulers,
        },
        {
          name: t('view.onionSkin'), icon: <LuLayers />,
          ...wire(h.onToggleOnionSkin), checked: onionSkinEnabled,
        },
        {
          name: t('view.fullscreen'), icon: <LuMaximize2 />,
          ...wire(h.onToggleFullscreen), checked: isFullscreen, shortcut: 'F11',
        },
        sep(),
        header(t('view.section.tools')),
        { name: t('view.filters'), icon: <LuFilter />,         ...wire(h.onOpenFilters), shortcut: 'Ctrl+F' },
        { name: t('view.text'),    icon: <LuType />,           ...wire(h.onOpenText),    shortcut: 'T' },
        { name: t('view.scripts'), icon: <LuBrackets />, ...wire(h.onToggleScripts), shortcut: 'Ctrl+Shift+S' },
        sep(),
        header(t('view.section.creative')),
        {
          name: t('view.aiGen'), icon: <LuBrainCircuit />,
          ...wire(h.onToggleAI), checked: activeAI,
        },
        {
          name: t('view.threeD'), icon: <LuBox />,
          ...wire(h.onToggle3D), checked: threeD,
        },
      ],
    },

    // ── Configuración ──────────────────────────────────────
    {
      key: 'config',
      label: t('menu.config'),
      items: [
        { name: t('config.shortcuts'), icon: <LuKeyboard />, ...wire(h.onOpenKeybindings) },
        sep(),
        {
          name: t('config.language'),
          icon: <LuLanguages />,
          submenu: [
            {
              name: t('config.language.es'),
              icon: <LuChevronsRight />,
              checked: lang === 'es',
              ...wire(() => h.onSetLanguage?.('es')),
            },
            {
              name: t('config.language.en'),
              icon: <LuChevronsRight />,
              checked: lang === 'en',
              ...wire(() => h.onSetLanguage?.('en')),
            },
          ],
        },
        {
          name: t('config.theme'),
          icon: <LuMoon />,
          submenu: [
            { name: t('config.theme.dark'),  icon: <LuMoon />, checked: true, disabled: true, hint: t('common.soon') },
            { name: t('config.theme.light'), icon: <LuSun />,  disabled: true, hint: t('common.soon') },
          ],
        },
      ],
    },

    // ── Ayuda ──────────────────────────────────────────────
    {
      key: 'help',
      label: t('menu.ayuda'),
      items: [
        { name: t('help.about'),     icon: <LuInfo />,     ...wire(h.onOpenAbout) },
        { name: t('help.shortcuts'), icon: <LuList />,     ...wire(h.onOpenKeybindings) },
        { name: t('help.docs'),      icon: <LuBookOpen />, ...wire(h.onOpenDocs) },
      ],
    },
  ];
}
