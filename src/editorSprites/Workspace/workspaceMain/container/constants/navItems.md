# navItems.jsx

## Propósito
Construye la lista de items (etiqueta + ícono + `onClick` + `toolValue`) que alimenta la barra lateral de herramientas del editor. Es un builder: recibe `setTool` para que cada ítem pueda cambiar la herramienta activa al pulsarse.

## API pública
- **`buildNavItemsLateral(setTool)`** (export nombrado y default).
  - Parámetro: `setTool: (toolId: string) => void` — el setter de la herramienta del padre.
  - Retorna: `Array<{ label: string, icon: ReactNode, onClick: () => void, toolValue: string }>` con 23 entradas en el orden fijo en que se muestran en el editor.

## Dependencias
- **Importa de:**
  - `react-icons/lu`, `react-icons/fa`, `react-icons/fa6`, `react-icons/tfi`, `react-icons/bs`, `react-icons/lia`, `react-icons/md`, `react-icons/pi`.
- **Es importado por:**
  - `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` (tras la refactorización).

## Estado gestionado
No aplica.

## Efectos secundarios
Ninguno: las funciones `onClick` solo invocan `setTool` cuando el usuario interactúa con el item.

## Notas de performance
- Se retorna un array nuevo en cada llamada; en el consumidor conviene envolver la llamada en `useMemo` si `setTool` es estable (lo es: viene del padre `editorMain.jsx`).
- Los iconos son nodos de React que se crean una vez por llamada — son baratos, pero evita invocar el builder dentro del render sin memoización si el árbol se repinta a 60fps.
