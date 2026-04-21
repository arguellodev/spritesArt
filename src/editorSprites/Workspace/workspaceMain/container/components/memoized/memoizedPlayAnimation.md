# memoizedPlayAnimation.jsx

## Propósito
Builder de JSX para `<PlayAnimation/>` (el componente que reproduce la animación frame a frame). El padre lo memoiza con `useMemo` dependiendo solo de `[frames]`.

## API pública
- **`renderPlayAnimation({ frames })`** — retorna `<PlayAnimation frames={frames} />`.

## Dependencias
- **Importa de:** `../../../../hooks/playAnimation`.
- **Es importado por:** `workspaceContainer.jsx`.

## Estado gestionado
Ninguno.

## Efectos secundarios
Ninguno.

## Notas de performance
- Es el builder más simple del lote; se extrae por simetría con los otros `Memoized*` para mantener la carpeta `memoized/` coherente.
