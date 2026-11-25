// The screenshot scenes behind ?shot=start|play|rush|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (work the oldest order: start the patty first, chop and
// fetch the rest while it grills, stack the plate, ring the bell), so the frame
// is what a short game really looks like and the same seed always gives the
// same frame.
import { LANE_COUNTER, LANE_FLOOR, STEP, createWorld, resetWorld, spawnOrder, step } from './kitchen.js';
import { GRILL, PLATE, SERVE, STATIONS } from './config.js';

const GRILL_X = STATIONS.find((s) => s.kind === 'grill').x;
const TRASH_X = STATIONS.find((s) => s.kind === 'trash').x;

const START_SECONDS = 4;
const PLAY_SECONDS = 26;
const RUSH_SECONDS = 50;
const SHIFT_SECONDS = 150;

function multisetDiff(recipe, plate) {
  const counts = {};
  for (const item of plate) counts[item] = (counts[item] || 0) + 1;
  return recipe.filter((item) => {
    if (counts[item] > 0) {
      counts[item] -= 1;
      return false;
    }
    return true;
  });
}

function stationX(ingredient) {
  const station = STATIONS.find((s) => s.ingredient === ingredient);
  return station ? station.x : 640;
}

/** The autopilot's goal: where to stand, which lane, and whether to interact. */
function goalFor(world) {
  const chef = world.chef;
  const order = world.orders[0];
  if (!order) return { lane: LANE_FLOOR, x: 640, interact: false };
  // A finished plate goes straight to the bell.
  if (world.plateReady) return { lane: LANE_FLOOR, x: SERVE.x, interact: true };
  // A wrong plate (its order expired) gets tossed.
  const recipeSet = new Set(order.recipe.items);
  if (world.plate.some((item) => !recipeSet.has(item))) {
    return { lane: LANE_COUNTER, x: TRASH_X, interact: true };
  }
  // Carrying something goes on the plate — unless nothing needs it any more.
  if (chef.carrying) {
    const wanted = world.orders.some((o) => {
      const missing = multisetDiff(o.recipe.items, world.plate);
      return missing.includes(chef.carrying);
    });
    if (wanted) return { lane: LANE_FLOOR, x: PLATE.x, interact: true };
    return { lane: LANE_COUNTER, x: TRASH_X, interact: true };
  }
  const missing = multisetDiff(order.recipe.items, world.plate);
  if (missing.length === 0) return { lane: LANE_FLOOR, x: SERVE.x, interact: true };
  // Patty first: start it grilling, fetch the rest while it cooks.
  if (missing.includes('patty')) {
    const cooked = world.grill.find((s) => s.state === 'cooked');
    if (cooked) return { lane: LANE_COUNTER, x: GRILL_X, interact: true };
    // A burnt patty blocks its slot: clear it before anything else.
    const burned = world.grill.find((s) => s.state === 'burned');
    if (burned) return { lane: LANE_COUNTER, x: GRILL_X, interact: true };
    const cooking = world.grill.some((s) => s.state === 'cooking');
    const free = world.grill.some((s) => s.state === 'empty');
    if (!cooking && free) return { lane: LANE_COUNTER, x: GRILL_X, interact: true };
    // While the patty grills, fetch the other missing ingredients.
    const other = missing.find((item) => item !== 'patty');
    if (other) return { lane: LANE_COUNTER, x: stationX(other), interact: true };
    // Patty is the only thing missing and it is still on the grill: wait by it.
    return { lane: LANE_COUNTER, x: GRILL_X, interact: false };
  }
  return { lane: LANE_COUNTER, x: stationX(missing[0]), interact: true };
}

/** One autopilot step: move toward the goal, interact on arrival. */
export function autopilotAction(world, prevInteract) {
  const goal = goalFor(world);
  const chef = world.chef;
  const dx = goal.x - chef.x;
  const move = Math.abs(dx) > 22 ? Math.sign(dx) : 0;
  // Only interact once settled in the goal lane: a press made mid-switch is
  // swallowed by the world, so the edge must fire after the chef arrives.
  const inRange = Math.abs(dx) <= 22 && chef.targetLane === goal.lane && chef.settled;
  const interact = goal.interact && inRange;
  return {
    move,
    interact,
    pressed: interact && !prevInteract,
    lane: goal.lane,
  };
}

/** Run the world forward `seconds` with the autopilot steering. */
function simulate(world, seconds) {
  let prevInteract = false;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.over) break;
    const action = autopilotAction(world, prevInteract);
    prevInteract = action.interact;
    step(world, STEP, action);
  }
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world, seed) {
  resetWorld(world, seed);
  if (name === 'play') {
    simulate(world, PLAY_SECONDS);
    return { screen: 'play', best: world.score };
  }
  if (name === 'rush') {
    world.level = 2;
    world.spawnTimer = 0.5;
    simulate(world, RUSH_SECONDS);
    // A rush reads in a glance: top the board up to three tickets.
    while (world.orders.length < 3) spawnOrder(world);
    return { screen: 'play', best: world.score };
  }
  if (name === 'end') {
    simulate(world, SHIFT_SECONDS);
    return { screen: 'over', best: world.score };
  }
  // start: let the kitchen breathe for a few seconds, then the title screen.
  simulate(world, START_SECONDS);
  return { screen: 'title', best: 0 };
}

export { GRILL, PLATE, SERVE };
