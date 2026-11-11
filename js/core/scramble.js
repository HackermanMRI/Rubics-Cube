import { parseMove } from './moves.js';

const FACES = ['R', 'L', 'U', 'D', 'F', 'B'];
const AXIS_OF = { R: 0, L: 0, U: 1, D: 1, F: 2, B: 2 };
const SUFFIXES = ['', "'", '2'];

/**
 * Random-move scramble. Never turns the same face twice in a row and never
 * turns the same axis three times in a row (e.g. "R L R"), so no move is wasted.
 */
export function generateScramble(length = 20, random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const faces = [];
  while (faces.length < length) {
    const face = pick(FACES);
    const prev = faces[faces.length - 1];
    const prev2 = faces[faces.length - 2];
    if (face === prev) continue;
    if (prev && prev2 && AXIS_OF[face] === AXIS_OF[prev] && AXIS_OF[face] === AXIS_OF[prev2]) continue;
    faces.push(face);
  }
  return faces.map((face) => parseMove(face + pick(SUFFIXES)));
}
