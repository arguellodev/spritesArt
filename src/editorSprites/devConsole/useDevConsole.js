// Hook que expone el snapshot del logger a la UI de React.
//
// useSyncExternalStore garantiza tearing-free reads y maneja por nosotros
// la suscripción/desuscripción al unmount. La frecuencia real de re-render
// la limita el logger via rAF, no este hook.

import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "./logger";

export function useDevConsole() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
