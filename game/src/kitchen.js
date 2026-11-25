// Sizzle & Serve — the kitchen: orders, stations, the chef, the plate, the grill.
// Pure state and rules: no DOM, no canvas here, so the same code runs the live
// game and the deterministic screenshot scenes. One fixed step (1/60 s) moves
// the world; the game loop and the shot stager both call `step`.
import {
  CANVAS,
  CHEF,
  CHOP_SECONDS,
  GRILL,
  INGREDIENTS,
  MAX_HEARTS,
  MAX_ORDERS,
  ORDERS,
  PLATE,
  RECIPES,
  SCORE,
  SERVE,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';
import { clamp, createRandom, pick, sameMultiset } from './random.js';

export const STEP = 1 / 60;
export const LANE_COUNTER = 0;
export const LANE_FLOOR = 1;
const LANE_Y = [398, CHEF.y];
const LANE_SPEED = 900;

export function spawnOrder(world) {
  const active = new Set(world.orders.map((o) => o.recipe.id));
  let choices = RECIPES.filter((r) => !active.has(r.id));
  if (choices.length === 0) choices = RECIPES;
  const recipe = pick(world.random, choices);
  const patience = Math.max(
    ORDERS.patienceMin,
    ORDERS.patience - (world.level - 1) * ORDERS.patienceStepPerLevel,
  );
  world.orders.push({
    id: world.nextOrderId,
    recipe,
    patience,
    maxPatience: patience,
    born: world.elapsed,
  });
  world.nextOrderId += 1;
}

/** A fresh world for a seed. */
export function createWorld(seed) {
  const world = {
    random: createRandom(seed),
    seed,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    level: 1,
    dishes: 0,
    served: 0,
    expired: 0,
    chef: { x: CANVAS.width / 2, y: LANE_Y[LANE_FLOOR], lane: LANE_FLOOR, targetLane: LANE_FLOOR, settled: true, facing: 1, carrying: null, chop: 0, chopping: null, walkPhase: 0, moving: false },
    grill: Array.from({ length: GRILL.slots }, () => ({ state: 'empty', t: 0 })),
    plate: [],
    orders: [],
    spawnTimer: ORDERS.firstAt,
    nextOrderId: 1,
    popups: [],
    particles: [],
    events: [],
    over: false,
    won: false,
    lastTickSecond: -1,
    plateReady: false,
  };
  return world;
}

/** Reset the world in place (keeps the same object for the renderer). */
export function resetWorld(world, seed) {
  const fresh = createWorld(seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

function stationAt(x) {
  for (const station of STATIONS) {
    const half = station.kind === 'grill' ? station.width / 2 : 0;
    if (x >= station.x - half - CHEF.reach && x <= station.x + half + CHEF.reach) return station;
  }
  return null;
}

function plateAt(x) {
  return x >= PLATE.x - PLATE.width / 2 - 30 && x <= PLATE.x + PLATE.width / 2 + 30;
}

function serveAt(x) {
  return x >= SERVE.x - SERVE.width / 2 - 30 && x <= SERVE.x + SERVE.width / 2 + 30;
}

function addPopup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color: color || '#ffffff', t: 0, life: 1.2 });
  if (world.popups.length > 12) world.popups.shift();
}

function addParticles(world, x, y, kind, n) {
  for (let i = 0; i < n; i += 1) {
    world.particles.push({
      x: x + (world.random() - 0.5) * 26,
      y: y + (world.random() - 0.5) * 10,
      vx: (world.random() - 0.5) * 30,
      vy: -18 - world.random() * 30,
      t: 0,
      life: 0.7 + world.random() * 0.6,
      kind,
      size: 3 + world.random() * 5,
    });
  }
  if (world.particles.length > 140) world.particles.splice(0, world.particles.length - 140);
}

function updatePlateReady(world) {
  const ready = world.plate.length > 0 && world.orders.some((o) => sameMultiset(world.plate, o.recipe.items));
  if (ready && !world.plateReady) world.events.push('plateReady');
  world.plateReady = ready;
}

/** Try the interaction for the station under the chef. `pressed` is a fresh key press. */
function interactStation(world, station, pressed, dt) {
  const chef = world.chef;
  if (station.kind === 'bin') {
    if (chef.carrying) return;
    const ingredient = INGREDIENTS[station.ingredient];
    if (ingredient.chop) {
      chef.chopping = station.ingredient;
      chef.chop += dt / CHOP_SECONDS;
      if (chef.chop >= 0.33 && chef.chop - dt / CHOP_SECONDS < 0.33) world.events.push('chop');
      if (chef.chop >= 0.66 && chef.chop - dt / CHOP_SECONDS < 0.66) world.events.push('chop');
      if (chef.chop >= 1) {
        chef.carrying = station.ingredient;
        chef.chop = 0;
        chef.chopping = null;
        world.events.push('pickup');
        addParticles(world, chef.x, chef.y - 60, 'leaf', 5);
      }
    } else if (pressed) {
      chef.carrying = station.ingredient;
      world.events.push('pickup');
    }
    return;
  }
  if (station.kind === 'grill') {
    if (chef.carrying) return;
    const cooked = world.grill.find((s) => s.state === 'cooked');
    if (cooked) {
      cooked.state = 'empty';
      cooked.t = 0;
      chef.carrying = 'patty';
      world.events.push('pickup');
      return;
    }
    const burned = world.grill.find((s) => s.state === 'burned');
    if (burned) {
      burned.state = 'empty';
      burned.t = 0;
      chef.carrying = 'burned';
      world.events.push('pickup');
      return;
    }
    if (pressed) {
      const free = world.grill.find((s) => s.state === 'empty');
      if (free) {
        free.state = 'cooking';
        free.t = 0;
        world.events.push('place');
      }
    }
    return;
  }
  if (station.kind === 'trash') {
    if (!pressed) return;
    if (chef.carrying) {
      chef.carrying = null;
      world.events.push('trash');
    } else if (world.plate.length > 0) {
      world.plate = [];
      world.events.push('trash');
      updatePlateReady(world);
    }
  }
}

/** Try the interaction for the plate table or the serve window (floor lane). */
function interactFloor(world, pressed) {
  const chef = world.chef;
  if (plateAt(chef.x)) {
    if (!pressed || !chef.carrying) return;
    if (chef.carrying === 'burned') {
      world.events.push('error');
      return;
    }
    if (world.plate.length >= 6) {
      world.events.push('error');
      return;
    }
    world.plate.push(chef.carrying);
    chef.carrying = null;
    world.events.push('place');
    addParticles(world, PLATE.x, PLATE.y - 20, 'puff', 4);
    updatePlateReady(world);
    return;
  }
  if (serveAt(chef.x)) {
    if (!pressed || world.plate.length === 0) return;
    const match = world.orders.find((o) => sameMultiset(world.plate, o.recipe.items));
    if (!match) {
      world.events.push('error');
      return;
    }
    const points =
      match.recipe.base +
      Math.round(match.patience) * SCORE.patienceBonusPerSecond +
      world.combo * SCORE.comboPerStep;
    world.score += points;
    world.coins += Math.max(5, Math.floor(points / 10));
    world.dishes += 1;
    world.served += 1;
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    world.orders = world.orders.filter((o) => o !== match);
    world.plate = [];
    world.plateReady = false;
    world.events.push('serve');
    addPopup(world, SERVE.x, SERVE.y - 60, `+${points}`, '#ffd166');
    addParticles(world, SERVE.x, SERVE.y - 30, 'star', 12);
    const newLevel = Math.floor(world.dishes / ORDERS.levelEveryDishes) + 1;
    if (newLevel > world.level) {
      world.level = newLevel;
      world.events.push('levelup');
      addPopup(world, CANVAS.width / 2, 120, `LEVEL ${newLevel}!`, '#7ac74f');
    }
  }
}

/**
 * Advance the world one fixed step. `action` is { move: -1|0|1, interact: bool,
 * pressed: bool, lane: 0|1|null } — `pressed` is true only on the frame the
 * interact key goes down, so holds and taps are distinct.
 */
export function step(world, dt, action) {
  world.events = [];
  if (world.over) return world.events;
  world.elapsed += dt;
  world.timeLeft = Math.max(0, world.timeLeft - dt);

  const chef = world.chef;
  // Lane switching.
  if (action.lane !== null && action.lane !== undefined && action.lane !== chef.targetLane) {
    chef.targetLane = action.lane;
    chef.chop = 0;
    chef.chopping = null;
  }
  const targetY = LANE_Y[chef.targetLane];
  if (chef.y !== targetY) {
    const dy = targetY - chef.y;
    const stepY = clamp(dy, -LANE_SPEED * dt, LANE_SPEED * dt);
    chef.y += stepY;
    chef.moving = true;
  } else {
    chef.moving = false;
  }
  chef.settled = chef.y === targetY;
  // Horizontal movement.
  if (action.move !== 0) {
    chef.x = clamp(chef.x + action.move * CHEF.speed * dt, CHEF.minX, CHEF.maxX);
    chef.facing = action.move;
    chef.moving = true;
    chef.walkPhase += dt * 11;
  }
  const switching = chef.y !== targetY;

  // Interactions (only when settled in a lane).
  if (!switching && action.interact) {
    if (chef.lane === LANE_COUNTER || chef.targetLane === LANE_COUNTER) {
      const station = stationAt(chef.x);
      if (station) interactStation(world, station, action.pressed, dt);
      else {
        chef.chop = 0;
        chef.chopping = null;
      }
    } else {
      interactFloor(world, action.pressed);
    }
  } else if (!action.interact) {
    chef.chop = 0;
    chef.chopping = null;
  }
  chef.lane = chef.targetLane;

  // Grill timers.
  for (const slot of world.grill) {
    if (slot.state === 'cooking') {
      slot.t += dt;
      if (slot.t >= GRILL.cookSeconds) {
        slot.state = 'cooked';
        slot.t = 0;
        world.events.push('ding');
      }
    } else if (slot.state === 'cooked') {
      slot.t += dt;
      if (slot.t >= GRILL.graceSeconds) {
        slot.state = 'burned';
        slot.t = 0;
        world.events.push('burn');
      }
    }
  }

  // Order spawning.
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0 && world.orders.length < MAX_ORDERS) {
    spawnOrder(world);
    const interval = Math.max(
      ORDERS.spawnEveryMin,
      ORDERS.spawnEvery - (world.level - 1) * ORDERS.spawnStepPerLevel,
    );
    world.spawnTimer = interval;
  }

  // Order patience.
  for (let i = world.orders.length - 1; i >= 0; i -= 1) {
    const order = world.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      world.orders.splice(i, 1);
      world.hearts -= 1;
      world.combo = 0;
      world.expired += 1;
      world.events.push('expire');
      addPopup(world, 300, 120, 'ORDER LOST!', '#ff6b6b');
      if (world.hearts <= 0) {
        world.over = true;
        world.won = false;
      }
    }
  }
  // An expired order can leave a finished plate with nothing to serve.
  updatePlateReady(world);

  // Last-ten-seconds ticks.
  const whole = Math.ceil(world.timeLeft);
  if (world.timeLeft <= 10.5 && whole !== world.lastTickSecond && whole > 0) {
    world.lastTickSecond = whole;
    world.events.push('tick');
  }

  // Shift end.
  if (world.timeLeft <= 0) {
    world.over = true;
    world.won = world.hearts > 0;
  }

  // Particles: grill steam, burnt smoke, serve sparkles drift.
  const grillX = STATIONS.find((s) => s.kind === 'grill').x;
  for (const slot of world.grill) {
    if (slot.state === 'cooking' && world.random() < 0.35) {
      addParticles(world, grillX + (world.random() - 0.5) * 150, 300, 'steam', 1);
    }
    if (slot.state === 'burned' && world.random() < 0.5) {
      addParticles(world, grillX + (world.random() - 0.5) * 150, 300, 'smoke', 1);
    }
  }
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 12 * dt;
    if (p.t >= p.life) world.particles.splice(i, 1);
  }
  for (let i = world.popups.length - 1; i >= 0; i -= 1) {
    const p = world.popups[i];
    p.t += dt;
    p.y -= 34 * dt;
    if (p.t >= p.life) world.popups.splice(i, 1);
  }

  return world.events;
}

/** The station (or plate/serve) the chef is standing at, for hints. */
export function currentSpot(world) {
  const chef = world.chef;
  if (chef.targetLane === LANE_COUNTER) return stationAt(chef.x);
  if (plateAt(chef.x)) return { id: 'plate', kind: 'plate', label: 'PLATE' };
  if (serveAt(chef.x)) return { id: 'serve', kind: 'serve', label: 'SERVE' };
  return null;
}

/** What the interact key would do right now — shown as a hint bubble. */
export function interactHint(world) {
  const chef = world.chef;
  const spot = currentSpot(world);
  if (!spot) return '';
  if (chef.carrying) {
    if (spot.kind === 'plate') return 'Add to plate';
    if (spot.kind === 'trash') return 'Throw away';
    return '';
  }
  if (spot.kind === 'bin') {
    const ingredient = INGREDIENTS[spot.ingredient];
    return ingredient.chop ? `Hold E: chop ${ingredient.name}` : `Take ${ingredient.name}`;
  }
  if (spot.kind === 'grill') {
    if (world.grill.some((s) => s.state === 'burned')) return 'Take burnt patty';
    if (world.grill.some((s) => s.state === 'cooked')) return 'Take cooked patty';
    if (world.grill.some((s) => s.state === 'empty')) return 'Put patty on grill';
    return 'Grilling…';
  }
  if (spot.kind === 'trash') return world.plate.length > 0 ? 'Clear the plate' : '';
  if (spot.kind === 'plate') return 'Plate is empty';
  if (spot.kind === 'serve') {
    if (world.plate.length === 0) return 'Nothing to serve';
    return world.plateReady ? 'Serve it!' : 'Does not match any order';
  }
  return '';
}
