"use no memo";

import PlayAnimation from "../../../../hooks/playAnimation";

// `PlayAnimation` ya es un `forwardRef`; aquí extraemos `playerRef` y lo
// pasamos como `ref` al componente. El resto de props se propagan tal cual.
// Motivación: el wiring anterior (`<PlayAnimation {...props} />`) nunca capturaba
// un ref, de modo que `useImperativeHandle` no exponía nada al padre y
// `onPlayTag` quedaba sin forma de disparar play/setFrame.
export function renderPlayAnimation({ playerRef, ...props }) {
  return <PlayAnimation {...props} ref={playerRef} />;
}
