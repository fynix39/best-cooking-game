// Sizzle & Serve — the game loop: screens, the fixed-step simulation, input,
// sound effects and the deterministic screenshot scenes (?shot=…&seed=…).
import { CANVAS } from './config.js';
import { LANE_COUNTER, LANE_FLOOR, STEP, createWorld, resetWorld, step } from './kitchen.js';
import { attachInput, readAction } from './input.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';
import {
  ensureAudio,
  isMuted,
  setSizzle,
  sfxChop,
  sfxError,
  sfxExpire,
  sfxLevelUp,
  sfxPickup,
  sfxPlace,
  sfxServe,
  sfxTick,
  toggleMute,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7') || 7;

const world = createWorld(seed);
let screen = 'title';
let best = 0;
try {
  best = Number(window.localStorage.getItem('sizzle-serve-best') || '0') || 0;
} catch {
  best = 0;
}

function saveBest() {
  if (world.score <= best) return;
  best = world.score;
  try {
    window.localStorage.setItem('sizzle-serve-best', String(best));
  } catch {
    // Storage is optional.
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function playEvents(events) {
  for (const event of events) {
    if (event === 'pickup') sfxPickup();
    else if (event === 'chop') sfxChop();
    else if (event === 'place') sfxPlace();
    else if (event === 'serve') {
      sfxServe();
      announce(`Served! Score ${world.score}.`);
    } else if (event === 'error') sfxError();
    else if (event === 'expire') {
      sfxExpire();
      announce(`Order lost! ${world.hearts} hearts left.`);
    } else if (event === 'levelup') sfxLevelUp();
    else if (event === 'tick') sfxTick();
  }
  setSizzle(world.grill.some((s) => s.state === 'cooking'));
}

function startGame() {
  ensureAudio();
  resetWorld(world, (Math.random() * 1e9) | 0);
  screen = 'play';
  announce('Shift started. Cook burgers and serve them before time runs out.');
}

// Click a station to walk there: the click sets a walk goal, cleared on arrival.
let clickGoal = null;

function onPointer(x, y) {
  ensureAudio();
  if (screen !== 'play') return;
  if (y < 360) {
    clickGoal = { x, lane: LANE_COUNTER, interact: true };
  } else if (y > 380 && y < 580 && x > 520 && x < 760) {
    clickGoal = { x: 640, lane: LANE_FLOOR, interact: true };
  } else if (y > 380 && y < 580 && x > 1120) {
    clickGoal = { x: 1200, lane: LANE_FLOOR, interact: true };
  } else {
    clickGoal = { x, lane: LANE_FLOOR, interact: false };
  }
}

attachInput(canvas, {
  onEnter: () => {
    if (screen === 'title' || screen === 'over') startGame();
  },
  onPause: () => {
    if (screen === 'play') {
      screen = 'pause';
      announce('Paused.');
    } else if (screen === 'pause') {
      screen = 'play';
      announce('Resumed.');
    }
  },
  onRestart: () => {
    if (screen === 'over' || screen === 'pause') startGame();
  },
  onMute: () => {
    toggleMute();
  },
  onPointer,
});

function fitCanvas() {
  const scale = Math.min(window.innerWidth / CANVAS.width, window.innerHeight / CANVAS.height);
  canvas.style.width = `${Math.floor(CANVAS.width * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (screen !== 'play') {
    drawGame(ctx, world, screen, { best, muted: isMuted() });
    return;
  }
  accumulator += dt;
  while (accumulator >= STEP) {
    accumulator -= STEP;
    const action = readAction();
    // Click-to-walk overrides the keys until the chef arrives.
    if (clickGoal) {
      const dx = clickGoal.x - world.chef.x;
      if (Math.abs(dx) > 24 || world.chef.targetLane !== clickGoal.lane || !world.chef.settled) {
        action.move = Math.abs(dx) > 24 ? Math.sign(dx) : 0;
        action.lane = clickGoal.lane;
        action.interact = false;
        action.pressed = false;
      } else {
        action.move = 0;
        action.lane = clickGoal.lane;
        action.interact = clickGoal.interact;
        action.pressed = clickGoal.interact;
        clickGoal = null;
      }
    }
    const events = step(world, STEP, action);
    playEvents(events);
    if (world.over) {
      saveBest();
      screen = 'over';
      announce(
        world.won
          ? `Shift over! Score ${world.score}, ${world.dishes} dishes served.`
          : `Out of hearts! Score ${world.score}.`,
      );
      setSizzle(false);
    }
  }
  drawGame(ctx, world, screen, { best, muted: isMuted() });
}

if (shotName) {
  // Screenshot scene: stage the world once, then draw it still.
  const staged = stageShot(shotName, world, seed);
  screen = staged.screen;
  best = staged.best;
  drawGame(ctx, world, screen, { best, muted: true });
  document.title = `Sizzle & Serve — shot ${shotName}`;
} else {
  requestAnimationFrame(frame);
}
