// A small seeded random number generator (mulberry32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `list` with the seeded random. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** Count how many times each value appears in `items`. */
export function countBy(items) {
  const counts = {};
  for (const item of items) counts[item] = (counts[item] || 0) + 1;
  return counts;
}

/** True when two ingredient lists hold the same multiset. */
export function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const ca = countBy(a);
  const cb = countBy(b);
  for (const key of Object.keys(ca)) if (ca[key] !== cb[key]) return false;
  return true;
}

/** Clamp `v` into [lo, hi]. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
