// 3x3 matrix helpers. Matrices are flat row-major arrays of 9 numbers in a
// right-handed frame: x right, y up, z towards the viewer.

export const identity = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];

function fromCosSin(axis, c, s) {
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** Rotation by `rad` radians about axis 0|1|2 (right-hand rule). */
export function rotation(axis, rad) {
  return fromCosSin(axis, Math.cos(rad), Math.sin(rad));
}

/** Exact integer rotation by `q` quarter turns, so cube state never drifts. */
export function quarterRotation(axis, q) {
  const k = ((q % 4) + 4) % 4;
  return fromCosSin(axis, [1, 0, -1, 0][k], [0, 1, 0, -1][k]);
}

export function multiply(a, b) {
  const out = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

export function apply(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function transpose(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/** Gram-Schmidt on the rows; keeps an accumulated orbit matrix a rotation. */
export function orthonormalize(m) {
  const norm = (v) => {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const x = norm([m[0], m[1], m[2]]);
  let y = [m[3], m[4], m[5]];
  const d = dot(x, y);
  y = norm([y[0] - d * x[0], y[1] - d * x[1], y[2] - d * x[2]]);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [...x, ...y, ...z];
}

/**
 * Nearest signed permutation matrix: which cube axis currently points along
 * each view axis. Greedy on the largest entries always yields a valid
 * permutation for a 3x3 matrix.
 */
export function snapToAxes(m) {
  const out = new Array(9).fill(0);
  const usedRow = [false, false, false];
  const usedCol = [false, false, false];
  for (let n = 0; n < 3; n++) {
    let best = -1;
    let bestRow = 0;
    let bestCol = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (usedRow[r] || usedCol[c]) continue;
        const v = Math.abs(m[r * 3 + c]);
        if (v > best) {
          best = v;
          bestRow = r;
          bestCol = c;
        }
      }
    }
    out[bestRow * 3 + bestCol] = m[bestRow * 3 + bestCol] < 0 ? -1 : 1;
    usedRow[bestRow] = true;
    usedCol[bestCol] = true;
  }
  return out;
}
