"use no memo";
// Hook compartido para detectar breakpoints. Usa matchMedia con listener
// para reaccionar a rotaciones / resize sin polling. Retorna un objeto
// con flags acumulativos: isMobile (≤480px) implica isMobileL (≤767px)
// implica isTablet (≤1023px), de modo que un componente puede checar
// el threshold mas alto que le importa sin combinar manualmente.
//
// Por que un singleton de breakpoints en lugar de useMediaQuery N veces:
//   - Una sola suscripcion por componente, no 3-4 por cada matchMedia
//     individual.
//   - Sintaxis mas legible: `vp.isMobileL` vs `useMediaQuery("(max-width: 767px)")`.
//   - Compatible con SSR/Electron sin window — devuelve all-false default.
//
// Por que `use no memo`: el archivo solo exporta el hook (que React
// Compiler maneja bien por si mismo) pero la funcion auxiliar
// `computeViewport` se llama desde el initializer de useState, fuera del
// dispatcher de React. Si el compiler le inyecta _c() podria fallar.

import { useEffect, useState } from "react";

function computeViewport() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return { isMobile: false, isMobileL: false, isTablet: false, isLaptop: false };
  }
  return {
    isMobile: window.matchMedia("(max-width: 480px)").matches,
    isMobileL: window.matchMedia("(max-width: 767px)").matches,
    isTablet: window.matchMedia("(max-width: 1023px)").matches,
    isLaptop: window.matchMedia("(max-width: 1279px)").matches,
  };
}

export function useViewport() {
  const [vp, setVp] = useState(computeViewport);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqls = [
      window.matchMedia("(max-width: 480px)"),
      window.matchMedia("(max-width: 767px)"),
      window.matchMedia("(max-width: 1023px)"),
      window.matchMedia("(max-width: 1279px)"),
    ];
    const handler = () => setVp(computeViewport());
    // addEventListener es el API moderno; addListener es fallback para
    // Safari < 14. Probamos por feature.
    mqls.forEach((m) => {
      if (m.addEventListener) m.addEventListener("change", handler);
      else if (m.addListener) m.addListener(handler);
    });
    return () => {
      mqls.forEach((m) => {
        if (m.removeEventListener) m.removeEventListener("change", handler);
        else if (m.removeListener) m.removeListener(handler);
      });
    };
  }, []);

  return vp;
}
