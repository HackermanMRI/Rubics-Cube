// Wires the game to the page: renderer, pointer, keyboard and the side panel.

import { Game } from './core/game.js';
import { CubeState } from './core/state.js';
import { multiply, rotation, snapToAxes, transpose } from './core/math.js';
import { moveName, parseAlgorithm, parseMove, remapMove } from './core/moves.js';
import { CubeRenderer } from './view/renderer.js';
import { PointerControls } from './view/pointer.js';

const $ = (id) => document.getElementById(id);

const DEFAULT_ORIENTATION = multiply(rotation(0, 0.45), rotation(1, -0.6));
const KEY_ORBIT_RAD = Math.PI / 12;
const HISTORY_SHOWN = 60;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const sceneEl = $('scene');
const speedEl = $('speed');
let orientation = DEFAULT_ORIENTATION;

const renderer = new CubeRenderer(sceneEl, CubeState.solved());
const game = new Game({
  animator: renderer,
  // The slider reads "speed", so a higher value means a shorter turn.
  getBaseDuration: () => (reducedMotion.matches ? 0 : Number(speedEl.max) + Number(speedEl.min) - Number(speedEl.value)),
});

function setOrientation(m) {
  orientation = m;
  renderer.setOrientation(m);
}

// Notation is relative to how the cube is being viewed: "R" always turns the
// side on your right, however far the cube has been orbited.
const viewToCube = (move) => remapMove(move, transpose(snapToAxes(orientation)));
const cubeToView = (move) => remapMove(move, snapToAxes(orientation));

function playNotation(token) {
  game.play(viewToCube(parseMove(token)), token);
}

const pointer = new PointerControls(sceneEl, {
  getOrientation: () => orientation,
  setOrientation,
  stickerAt: (target) => renderer.stickerAt(target),
  canTurn: () => !game.queue.busy,
  onTurn: (move) => game.play(move, moveName(cubeToView(move))),
});

// ---- panel -----------------------------------------------------------------

const formatTime = (ms) => {
  const total = Math.floor(ms / 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 6000))}:${pad(Math.floor(total / 100) % 60)}.${pad(total % 100)}`;
};

function status() {
  if (game.timerRunning) return ['Solving', 'running'];
  if (game.timer.elapsed > 0) return ['Solved!', 'solved'];
  if (game.timer.armed) return ['Scrambled: timer starts on your first turn', 'armed'];
  if (game.state.isSolved() && !game.queue.busy) return ['Solved', 'solved'];
  return ['In progress', 'idle'];
}

let timerFrame = 0;
function tickTimer() {
  $('time').textContent = formatTime(game.elapsedMs());
  timerFrame = game.timerRunning ? requestAnimationFrame(tickTimer) : 0;
}

function render() {
  renderer.setState(game.state);
  $('moves').textContent = String(game.moveCount);
  const [text, kind] = status();
  $('status').textContent = text;
  $('status').dataset.kind = kind;
  const labels = game.history.slice(-HISTORY_SHOWN).map((entry) => entry.label);
  $('history').textContent = labels.length
    ? (game.history.length > HISTORY_SHOWN ? '… ' : '') + labels.join(' ')
    : 'No moves yet';
  $('undo').disabled = game.history.length === 0;
  $('redo').disabled = game.redoStack.length === 0;
  if (!timerFrame) tickTimer();
}

game.onChange(render);

$('scramble').addEventListener('click', () => game.scramble());
$('reset').addEventListener('click', () => game.reset());
$('solve').addEventListener('click', () => game.solve());
$('undo').addEventListener('click', () => game.undo());
$('redo').addEventListener('click', () => game.redo());
$('reset-view').addEventListener('click', () => setOrientation(DEFAULT_ORIENTATION));

$('pad').addEventListener('click', (e) => {
  const button = e.target instanceof Element ? e.target.closest('button[data-move]') : null;
  if (button) playNotation(button.dataset.move);
});

$('algorithm-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('algorithm');
  const error = $('algorithm-error');
  try {
    const moves = parseAlgorithm(input.value);
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    for (const move of moves) game.play(viewToCube(move), moveName(move));
  } catch (err) {
    error.textContent = `${err.message}. Use moves like R U' F2 M x Rw.`;
    input.setAttribute('aria-invalid', 'true');
  }
});

// ---- keyboard --------------------------------------------------------------

const MOVE_KEYS = { u: 'U', d: 'D', l: 'L', r: 'R', f: 'F', b: 'B', m: 'M', e: 'E', s: 'S', x: 'x', y: 'y', z: 'z' };
const ORBIT_KEYS = {
  ArrowLeft: [-KEY_ORBIT_RAD, 0],
  ArrowRight: [KEY_ORBIT_RAD, 0],
  ArrowUp: [0, -KEY_ORBIT_RAD],
  ArrowDown: [0, KEY_ORBIT_RAD],
};

window.addEventListener('keydown', (e) => {
  const el = e.target;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  if (e.ctrlKey || e.metaKey) {
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) game.redo();
      else game.undo();
    } else if (key === 'y') {
      e.preventDefault();
      game.redo();
    }
    return;
  }
  if (e.altKey) return;

  if (ORBIT_KEYS[key]) {
    e.preventDefault();
    pointer.orbit(...ORBIT_KEYS[key]);
  } else if (MOVE_KEYS[key]) {
    e.preventDefault();
    playNotation(MOVE_KEYS[key] + (e.shiftKey ? "'" : ''));
  }
});

// ---- start -----------------------------------------------------------------

new ResizeObserver(() => renderer.resize()).observe(sceneEl);
setOrientation(DEFAULT_ORIENTATION);
render();
