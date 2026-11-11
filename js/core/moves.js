// Move model and standard (WCA-style) notation.
//
// A move is { axis, layers, q }:
//   axis   0|1|2 (x|y|z)
//   layers which slices along that axis turn, from [-1, 0, 1]
//   q      signed quarter turns about +axis (right-hand rule); +-2 is a half turn
//
// "Clockwise" in notation means clockwise when looking at the face from
// outside, which is a NEGATIVE right-hand rotation for the +axis faces
// (R, U, F) and a positive one for the -axis faces (L, D, B).

export const MAX_ALGORITHM_MOVES = 500;

function makeMove(axis, layers, q) {
  return Object.freeze({
    axis,
    layers: Object.freeze([...layers].map((l) => l + 0).sort((a, b) => a - b)),
    q,
  });
}

const BASE = Object.freeze({
  R: makeMove(0, [1], -1),
  L: makeMove(0, [-1], 1),
  U: makeMove(1, [1], -1),
  D: makeMove(1, [-1], 1),
  F: makeMove(2, [1], -1),
  B: makeMove(2, [-1], 1),
  // Slices follow L, D and F respectively.
  M: makeMove(0, [0], 1),
  E: makeMove(1, [0], 1),
  S: makeMove(2, [0], -1),
  // Wide moves: the face plus the adjacent slice.
  r: makeMove(0, [0, 1], -1),
  l: makeMove(0, [-1, 0], 1),
  u: makeMove(1, [0, 1], -1),
  d: makeMove(1, [-1, 0], 1),
  f: makeMove(2, [0, 1], -1),
  b: makeMove(2, [-1, 0], 1),
  // Whole-cube rotations follow R, U and F.
  x: makeMove(0, [-1, 0, 1], -1),
  y: makeMove(1, [-1, 0, 1], -1),
  z: makeMove(2, [-1, 0, 1], -1),
});

const keyOf = (move) => `${move.axis}:${move.layers.join(',')}`;
const LETTER_BY_KEY = new Map(Object.entries(BASE).map(([letter, m]) => [keyOf(m), letter]));

const TOKEN = /^([RLUDFB]w?|[MESxyzrludfb])(2?)(['’]?)$/;

/** Parse one token such as "R", "U'", "F2" or "Rw'". Throws on anything else. */
export function parseMove(token) {
  const match = TOKEN.exec(token);
  if (!match) throw new Error(`Unknown move "${token.slice(0, 12)}"`);
  const letter = match[1].endsWith('w') ? match[1][0].toLowerCase() : match[1];
  const base = BASE[letter];
  const q = base.q * (match[2] ? 2 : 1) * (match[3] ? -1 : 1);
  return makeMove(base.axis, base.layers, q);
}

/** Parse a whitespace-separated algorithm, e.g. "R U R' U'". */
export function parseAlgorithm(text) {
  const tokens = String(text).trim().split(/\s+/).filter(Boolean);
  if (tokens.length > MAX_ALGORITHM_MOVES) {
    throw new Error(`Algorithm is longer than ${MAX_ALGORITHM_MOVES} moves`);
  }
  return tokens.map(parseMove);
}

export function moveName(move) {
  const letter = LETTER_BY_KEY.get(keyOf(move));
  if (!letter) throw new Error('Move has no notation');
  const baseQ = BASE[letter].q;
  if (move.q === baseQ) return letter;
  if (move.q === -baseQ) return `${letter}'`;
  return `${letter}2`; // a half turn looks the same in either direction
}

export const inverse = (move) => makeMove(move.axis, move.layers, -move.q);

export const isCubeRotation = (move) => move.layers.length === 3;

/**
 * Re-express a move in another frame. `p` is a signed permutation matrix
 * mapping the move's frame to the target frame (see snapToAxes).
 */
export function remapMove(move, p) {
  for (let row = 0; row < 3; row++) {
    const sign = p[row * 3 + move.axis];
    if (sign) return makeMove(row, move.layers.map((l) => l * sign), move.q * sign);
  }
  throw new Error('Not a permutation matrix');
}

/** Merge consecutive turns of the same layers and drop the ones that cancel. */
export function simplify(moves) {
  const out = [];
  for (const move of moves) {
    const last = out[out.length - 1];
    if (last && keyOf(last) === keyOf(move)) {
      out.pop();
      const q = [0, 1, 2, -1][(((last.q + move.q) % 4) + 4) % 4];
      if (q) out.push(makeMove(move.axis, move.layers, q));
    } else {
      out.push(move);
    }
  }
  return out;
}
