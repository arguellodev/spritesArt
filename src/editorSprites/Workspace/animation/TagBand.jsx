// TagBand — render visual de animation tags como bandas alineadas con el strip
// de frame-numbers. Cada tag ocupa columnas [from..to] con su propio color.
// Aseprite-style. Solo presentacional: el padre maneja el state.
//
// Props:
//   tags: AnimationTag[]
//   frameNumbers: number[]      // Valores 1..N en el orden del strip.
//   cellWidth: number           // Ancho en px de cada FrameNumberCell.
//   gapPx?: number              // Separacion horizontal entre celdas (default 0).
//   onClickTag?: (tag) => void
//   onDoubleClickTag?: (tag) => void
//   onContextMenuTag?: (tag, evt) => void

import React, { useMemo } from 'react';
import './TagBand.css';

const MAX_ROWS = 2;

// Algoritmo greedy: a cada tag (orden de entrada) le asigna la primera fila
// libre dentro de su rango. Si no hay (todas las MAX_ROWS filas chocan), el
// tag se omite del render (overflow visual aceptado por simplicidad).
function packIntoRows(tags) {
  const rows = []; // rows[i] = tags ya colocados en esa fila
  const placement = []; // [{ tag, rowIndex }]
  for (const tag of tags) {
    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      const collides = rows[r].some(t => !(tag.to < t.from || tag.from > t.to));
      if (!collides) {
        rows[r].push(tag);
        placement.push({ tag, rowIndex: r });
        placed = true;
        break;
      }
    }
    if (!placed && rows.length < MAX_ROWS) {
      rows.push([tag]);
      placement.push({ tag, rowIndex: rows.length - 1 });
    }
    // Si no cabe en MAX_ROWS, el tag no se renderiza.
  }
  return { rows: Math.min(rows.length, MAX_ROWS), placement };
}

const TagBand = ({
  tags = [],
  frameNumbers = [],
  cellWidth,
  gapPx = 0,
  onClickTag,
  onDoubleClickTag,
  onContextMenuTag,
}) => {
  const { rows, placement } = useMemo(() => packIntoRows(tags), [tags]);

  if (!tags.length || !cellWidth || !frameNumbers.length) return null;

  // Map frameNumber -> indice en el strip. Asumimos frameNumbers contiguo
  // y ordenado, que es el caso del editor (1..N).
  const indexOf = (frameN) => frameNumbers.indexOf(frameN);

  return (
    <div className="tag-band-container" style={{ minHeight: rows * 16 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="tag-band-row">
          {placement
            .filter(p => p.rowIndex === r)
            .map(({ tag }) => {
              const startIdx = indexOf(tag.from);
              const endIdx = indexOf(tag.to);
              if (startIdx < 0 || endIdx < 0) return null;
              const left = startIdx * (cellWidth + gapPx);
              const width = (endIdx - startIdx + 1) * cellWidth
                          + (endIdx - startIdx) * gapPx;
              return (
                <div
                  key={tag.id}
                  className="tag-band-item"
                  style={{ left, width, background: tag.color }}
                  title={`${tag.name} (${tag.from}–${tag.to})`}
                  onClick={() => onClickTag?.(tag)}
                  onDoubleClick={() => onDoubleClickTag?.(tag)}
                  onContextMenu={(e) => { e.preventDefault(); onContextMenuTag?.(tag, e); }}
                >
                  {tag.name}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
};

export default TagBand;
