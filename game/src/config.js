// Sizzle & Serve — configuration: canvas, stations, recipes, timings.
// Every number that tunes the game lives here, so balancing is one file.
export const CANVAS = { width: 1280, height: 720 };

export const SHIFT_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 3;

// Ingredient ids, in the order they stack on a burger (bottom to top).
export const INGREDIENTS = {
  bun: { name: 'Bun', color: '#e8a54b', dark: '#c47f2a', chop: false },
  patty: { name: 'Patty', color: '#8a5a2b', dark: '#5d3a17', chop: false, grill: true },
  lettuce: { name: 'Lettuce', color: '#7ac74f', dark: '#4d8f2e', chop: true },
  tomato: { name: 'Tomato', color: '#e4572e', dark: '#b23a1d', chop: true },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#d9a41f', chop: false },
  sauce: { name: 'Sauce', color: '#ff8c42', dark: '#d96c1e', chop: false },
};

// Recipes the order board can ask for. `items` is the exact multiset a plate must hold.
export const RECIPES = [
  { id: 'classic', name: 'Classic', items: ['bun', 'patty', 'lettuce', 'tomato'], base: 100 },
  { id: 'melt', name: 'Cheese Melt', items: ['bun', 'patty', 'cheese', 'sauce'], base: 110 },
  { id: 'garden', name: 'Garden', items: ['bun', 'lettuce', 'tomato', 'cheese', 'sauce'], base: 120 },
  { id: 'deluxe', name: 'Deluxe', items: ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'sauce'], base: 150 },
];

// Stations along the top counter. `x` is the centre of the station's floor zone;
// the chef interacts with the station whose zone he stands in.
export const STATIONS = [
  { id: 'bun', kind: 'bin', ingredient: 'bun', x: 110, label: 'BUNS' },
  { id: 'lettuce', kind: 'bin', ingredient: 'lettuce', x: 255, label: 'LETTUCE' },
  { id: 'tomato', kind: 'bin', ingredient: 'tomato', x: 400, label: 'TOMATO' },
  { id: 'cheese', kind: 'bin', ingredient: 'cheese', x: 545, label: 'CHEESE' },
  { id: 'sauce', kind: 'bin', ingredient: 'sauce', x: 680, label: 'SAUCE' },
  { id: 'grill', kind: 'grill', x: 870, label: 'GRILL', width: 200 },
  { id: 'trash', kind: 'trash', x: 1075, label: 'TRASH' },
];

// The assembly plate table and the serve window live on the mid floor.
export const PLATE = { x: 640, y: 470, width: 190, height: 96 };
export const SERVE = { x: 1200, y: 470, width: 130, height: 150 };

// Grill timings (seconds). A patty cooks, then stays good, then burns.
export const GRILL = { cookSeconds: 4, graceSeconds: 8, slots: 2 };
export const CHOP_SECONDS = 0.9;
export const CHEF = { speed: 400, y: 612, minX: 56, maxX: 1224, reach: 62 };

// Order pacing. Spawn interval and patience shrink as the level rises.
export const ORDERS = {
  firstAt: 1.0,
  spawnEvery: 12,
  spawnEveryMin: 7,
  spawnStepPerLevel: 1.0,
  patience: 42,
  patienceMin: 26,
  patienceStepPerLevel: 3,
  levelEveryDishes: 4,
};

// Scoring.
export const SCORE = { serveBase: 0, patienceBonusPerSecond: 3, comboPerStep: 10, wrongServe: 0 };
export const STARS = { one: 500, two: 1200, three: 2000 };
