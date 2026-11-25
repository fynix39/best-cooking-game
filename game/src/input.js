// Keyboard and mouse input for Sizzle & Serve. The game loop polls `read()`
// once a step: { move, interact, pressed, lane, click } — `pressed` is true
// only on the frame a key goes down, so holding E chops and tapping E grabs.
import { LANE_COUNTER, LANE_FLOOR } from './kitchen.js';

const keys = new Set();
let interactHeld = false;
let interactPressed = false;
let laneRequest = null;
let clickTarget = null;

function keyName(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

export function attachInput(canvas, callbacks) {
  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(key);
    if (key === 'e' || key === ' ') {
      if (!interactHeld) interactPressed = true;
      interactHeld = true;
    }
    if (key === 'w' || key === 'ArrowUp') laneRequest = LANE_COUNTER;
    if (key === 's' || key === 'ArrowDown') laneRequest = LANE_FLOOR;
    if (key === 'Enter' && callbacks.onEnter) callbacks.onEnter();
    if ((key === 'p' || key === 'Escape') && callbacks.onPause) callbacks.onPause();
    if (key === 'r' && callbacks.onRestart) callbacks.onRestart();
    if (key === 'm' && callbacks.onMute) callbacks.onMute();
  });
  window.addEventListener('keyup', (event) => {
    const key = keyName(event);
    keys.delete(key);
    if (key === 'e' || key === ' ') interactHeld = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    interactHeld = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    clickTarget = { x, y };
    if (callbacks.onPointer) callbacks.onPointer(x, y);
  });
}

/** Read the current action; call once per fixed step. */
export function readAction() {
  let move = 0;
  if (keys.has('a') || keys.has('ArrowLeft')) move -= 1;
  if (keys.has('d') || keys.has('ArrowRight')) move += 1;
  const action = {
    move,
    interact: interactHeld,
    pressed: interactPressed,
    lane: laneRequest,
    click: clickTarget,
  };
  interactPressed = false;
  laneRequest = null;
  clickTarget = null;
  return action;
}

/** True while any movement key is held. */
export function anyKey() {
  return keys.size > 0;
}
