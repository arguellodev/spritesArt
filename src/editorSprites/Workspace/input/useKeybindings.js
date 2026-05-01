"use no memo";
// useKeybindings.js — hook centralizado de keybindings.
// Directiva `"use no memo"` a nivel de módulo: con `compilationMode: 'all'` el
// React Compiler intenta memoizar incluso helpers puros (`normalizeKey`,
// `eventToKey`), inyectando hooks en su cuerpo. Al ser invocados desde un
// `.map()` dentro de un `useCallback` (ver `register`), eso dispara
// "Invalid hook call" en runtime. Saltamos la compilación — es código
// hot-path simple, no necesita memoización automática.
//
// Uso:
//   const registry = useKeybindingsRegistry({ persistKey: 'pixcalli.keybindings' });
//   registry.register('editor.undo', ['ctrl+z', 'cmd+z'], () => undo());
//   registry.register('editor.redo', ['ctrl+y', 'ctrl+shift+z', 'cmd+shift+z'], () => redo());
//   useKeybindingsListener(registry);     // engancha keydown global
//
//   // Mostrar en settings/keybindingsPanel:
//   const actions = registry.listActions();
//   registry.rebind('editor.undo', ['ctrl+shift+z']);

import { useCallback, useEffect, useMemo, useRef } from 'react';

const DEFAULT_STORAGE_KEY = 'pixcalli.keybindings';

/**
 * Normaliza una tecla a formato canónico "mods+key" en lowercase.
 * Ejemplo: "Ctrl+Shift+Z" → "ctrl+shift+z". "cmd" se trata como "meta".
 */
function normalizeKey(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .map((p) => (p === 'cmd' ? 'meta' : p))
    .sort((a, b) => {
      // Orden canónico: mods primero.
      const order = (k) => ({ ctrl: 0, meta: 1, alt: 2, shift: 3 }[k] ?? 10);
      return order(a) - order(b);
    })
    .join('+');
}

function eventToKey(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.metaKey) parts.push('meta');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const k = e.key?.toLowerCase() ?? '';
  if (!['control', 'meta', 'alt', 'shift'].includes(k)) parts.push(k);
  return normalizeKey(parts.join('+'));
}

/**
 * Crea un registry. Mantiene defaults + overrides persistidos en localStorage.
 */
export function useKeybindingsRegistry({ persistKey = DEFAULT_STORAGE_KEY } = {}) {
  // actionsRef: Map<actionId, { keys: string[], handler: fn, description: string }>
  const actionsRef = useRef(new Map());

  const overrides = useMemo(() => {
    try {
      const raw = localStorage.getItem(persistKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [persistKey]);

  const persist = useCallback(
    (map) => {
      try {
        const obj = {};
        for (const [id, entry] of map) obj[id] = entry.keys;
        localStorage.setItem(persistKey, JSON.stringify(obj));
      } catch {
        // noop
      }
    },
    [persistKey]
  );

  const register = useCallback(
    (actionId, defaultKeys, handler, description = '') => {
      const keys = overrides[actionId] ?? defaultKeys;
      actionsRef.current.set(actionId, {
        keys: keys.map(normalizeKey),
        handler,
        description,
        defaults: defaultKeys.map(normalizeKey),
      });
    },
    [overrides]
  );

  const unregister = useCallback((actionId) => {
    actionsRef.current.delete(actionId);
  }, []);

  const rebind = useCallback(
    (actionId, newKeys) => {
      const entry = actionsRef.current.get(actionId);
      if (!entry) return;
      entry.keys = newKeys.map(normalizeKey);
      persist(actionsRef.current);
    },
    [persist]
  );

  const resetToDefaults = useCallback(
    (actionId) => {
      const entry = actionsRef.current.get(actionId);
      if (!entry) return;
      entry.keys = [...entry.defaults];
      persist(actionsRef.current);
    },
    [persist]
  );

  const listActions = useCallback(() => {
    return Array.from(actionsRef.current.entries()).map(([id, entry]) => ({
      id,
      keys: entry.keys,
      description: entry.description,
      defaults: entry.defaults,
    }));
  }, []);

  const dispatch = useCallback((e) => {
    const key = eventToKey(e);
    if (!key) return false;
    for (const entry of actionsRef.current.values()) {
      if (entry.keys.includes(key)) {
        entry.handler(e);
        return true;
      }
    }
    return false;
  }, []);

  return { register, unregister, rebind, resetToDefaults, listActions, dispatch };
}

/**
 * Hook que engancha el dispatcher global a window.keydown.
 * Ignora los keybindings cuando el foco está en un input/textarea (excepto si
 * el actionId empieza con 'always.' para indicar que sí debe escucharse).
 */
export function useKeybindingsListener(registry, { ignoreWhenTyping = true } = {}) {
  useEffect(() => {
    const onKeydown = (e) => {
      if (ignoreWhenTyping) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      }
      const handled = registry.dispatch(e);
      if (handled) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [registry, ignoreWhenTyping]);
}

export { normalizeKey, eventToKey };
