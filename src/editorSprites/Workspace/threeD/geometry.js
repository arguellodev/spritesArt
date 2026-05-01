// Helpers de aplanamiento geométrico — comprimen un eje del modelo
// (X/Y/Z) hacia 0. Útil para "aplastar" un modelo 3D contra un plano para
// pixel-art tipo paper-doll o sprite-sheet sin perder shading.
//
// El estado original se guarda en geometry.userData.originalPositions la
// primera vez, así reset y aplicaciones repetidas no acumulan distorsión.

export function flattenGeometry(object, mode, amount) {
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const positions = child.geometry.attributes.position;
    if (!positions) return;

    if (!child.geometry.userData.originalPositions) {
      child.geometry.userData.originalPositions = positions.array.slice();
    }
    const original = child.geometry.userData.originalPositions;
    const current = positions.array;

    for (let i = 0; i < original.length; i += 3) {
      current[i] = original[i];
      current[i + 1] = original[i + 1];
      current[i + 2] = original[i + 2];

      if (mode === "flatten-z") {
        current[i + 2] *= 1 - amount;
      } else if (mode === "flatten-y") {
        current[i + 1] *= 1 - amount;
      } else if (mode === "flatten-x") {
        current[i] *= 1 - amount;
      }
    }

    positions.needsUpdate = true;
    child.geometry.computeVertexNormals();
  });
}

export function resetGeometry(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.userData.originalPositions) return;

    const positions = child.geometry.attributes.position;
    const original = child.geometry.userData.originalPositions;
    const current = positions.array;
    for (let i = 0; i < original.length; i++) {
      current[i] = original[i];
    }
    positions.needsUpdate = true;
    child.geometry.computeVertexNormals();
  });
}
