"use no memo";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { cargarLayout, guardarLayoutDebounced } from "./panelStorage";

const PanelContext = createContext(null);

const PANELES_DEFAULT = {
  layerColor: {
    id: "layerColor",
    titulo: "Color",
    modo: "docked",
    pos: { x: 120, y: 120 },
    tam: { w: 300, h: 480 },
    zIndex: 10,
    visible: true,
  },
  playAnimation: {
    id: "playAnimation",
    titulo: "Animación",
    modo: "docked",
    pos: { x: 180, y: 180 },
    tam: { w: 300, h: 320 },
    zIndex: 10,
    visible: true,
  },
  viewportNavigator: {
    id: "viewportNavigator",
    titulo: "Navegador",
    modo: "docked",
    pos: { x: 240, y: 240 },
    tam: { w: 300, h: 320 },
    zIndex: 10,
    visible: true,
  },
};

const ORDEN_DOCK = ["viewportNavigator", "layerColor", "playAnimation"];

function clonarEstadoBase() {
  return JSON.parse(JSON.stringify(PANELES_DEFAULT));
}

function reducer(state, action) {
  switch (action.type) {
    case "setModo": {
      const prev = state[action.panelId];
      if (!prev) return state;
      return {
        ...state,
        [action.panelId]: { ...prev, modo: action.modo },
      };
    }
    case "setPos": {
      const prev = state[action.panelId];
      if (!prev) return state;
      return {
        ...state,
        [action.panelId]: { ...prev, pos: { ...action.pos } },
      };
    }
    case "setTam": {
      const prev = state[action.panelId];
      if (!prev) return state;
      return {
        ...state,
        [action.panelId]: { ...prev, tam: { ...action.tam } },
      };
    }
    case "setPosTam": {
      const prev = state[action.panelId];
      if (!prev) return state;
      return {
        ...state,
        [action.panelId]: {
          ...prev,
          pos: action.pos ? { ...action.pos } : prev.pos,
          tam: action.tam ? { ...action.tam } : prev.tam,
        },
      };
    }
    case "traerAlFrente": {
      const maxZ = Math.max(...Object.values(state).map((p) => p.zIndex || 0));
      const prev = state[action.panelId];
      if (!prev) return state;
      if (prev.zIndex === maxZ && maxZ > 0) return state;
      return {
        ...state,
        [action.panelId]: { ...prev, zIndex: maxZ + 1 },
      };
    }
    case "toggleVisible": {
      const prev = state[action.panelId];
      if (!prev) return state;
      return {
        ...state,
        [action.panelId]: { ...prev, visible: !prev.visible },
      };
    }
    case "reAnclarTodos": {
      const next = {};
      for (const id of Object.keys(state)) {
        next[id] = { ...state[id], modo: "docked", visible: true };
      }
      return next;
    }
    case "resetLayout":
      return clonarEstadoBase();
    case "hidratar":
      return action.state || state;
    default:
      return state;
  }
}

export function PanelProvider({ children }) {
  const [paneles, dispatch] = useReducer(reducer, null, clonarEstadoBase);
  const hidratadoRef = useRef(false);

  useEffect(() => {
    if (hidratadoRef.current) return;
    hidratadoRef.current = true;
    const persistido = cargarLayout();
    if (persistido) {
      const fusionado = {};
      for (const id of Object.keys(PANELES_DEFAULT)) {
        const base = PANELES_DEFAULT[id];
        const guardado = persistido[id] || {};
        const modo = guardado.modo === "popped" ? "flotante" : guardado.modo || base.modo;
        fusionado[id] = {
          ...base,
          ...guardado,
          modo,
          pos: guardado.pos || base.pos,
          tam: guardado.tam || base.tam,
        };
      }
      dispatch({ type: "hidratar", state: fusionado });
    }
  }, []);

  useEffect(() => {
    guardarLayoutDebounced(paneles);
  }, [paneles]);

  const setModo = useCallback((panelId, modo) => dispatch({ type: "setModo", panelId, modo }), []);
  const setPos = useCallback((panelId, pos) => dispatch({ type: "setPos", panelId, pos }), []);
  const setTam = useCallback((panelId, tam) => dispatch({ type: "setTam", panelId, tam }), []);
  const setPosTam = useCallback(
    (panelId, pos, tam) => dispatch({ type: "setPosTam", panelId, pos, tam }),
    []
  );
  const traerAlFrente = useCallback(
    (panelId) => dispatch({ type: "traerAlFrente", panelId }),
    []
  );
  const toggleVisible = useCallback(
    (panelId) => dispatch({ type: "toggleVisible", panelId }),
    []
  );
  const reAnclarTodos = useCallback(() => dispatch({ type: "reAnclarTodos" }), []);
  const resetLayout = useCallback(() => dispatch({ type: "resetLayout" }), []);

  const value = useMemo(
    () => ({
      paneles,
      setModo,
      setPos,
      setTam,
      setPosTam,
      traerAlFrente,
      toggleVisible,
      reAnclarTodos,
      resetLayout,
      ordenDock: ORDEN_DOCK,
    }),
    [paneles, setModo, setPos, setTam, setPosTam, traerAlFrente, toggleVisible, reAnclarTodos, resetLayout]
  );

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export function usePanel(panelId) {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  const estado = ctx.paneles[panelId];
  return {
    estado,
    setModo: (modo) => ctx.setModo(panelId, modo),
    setPos: (pos) => ctx.setPos(panelId, pos),
    setTam: (tam) => ctx.setTam(panelId, tam),
    setPosTam: (pos, tam) => ctx.setPosTam(panelId, pos, tam),
    traerAlFrente: () => ctx.traerAlFrente(panelId),
    toggleVisible: () => ctx.toggleVisible(panelId),
  };
}

export function usePanelesLayout() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanelesLayout debe usarse dentro de <PanelProvider>");
  return ctx;
}
