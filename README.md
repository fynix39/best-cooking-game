# best-cooking-game

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/fynix39/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/fynix39/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle & Serve** — a 150-second dinner-rush cooking game, built for the make.fun best-cooking-game bounty. You are the chef of a small burger kitchen: grill patties, chop lettuce and tomato, stack burgers to match the order board, and ring the service bell before the customers lose patience.

## How to play

- **← → / A D** — walk the kitchen
- **W / S** — switch between the counter lane (ingredients, grill, trash) and the floor lane (assembly plate, service window)
- **E** (tap) — take an ingredient, put a patty on the grill, add to the plate, serve a finished dish, toss the trash
- **E** (hold) — chop lettuce and tomato
- **Mouse** — click a station to walk there
- **P** — pause · **M** — mute · **R** — restart · **Enter** — start

Orders arrive on the board with a patience timer. A patty needs 4 seconds on the grill and burns if left too long. Serve the exact burger an order asks for to score; the faster the serve and the longer your combo, the more points. Three lost orders end the shift early.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is plain static files under `game/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library in `vendor/makefun-game.ts`.

## Screenshots

The four images in `screenshots/` are real renders of the game's own code, taken in a browser from deterministic scenes (`shots.json`): the title screen, a mid-shift dish mid-assembly (the cover), a service rush, and the end of a shift. Each scene plays the real rules forward from a seeded world with an autopilot chef (`game/src/shots.js`).

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning: recipes, stations, timings, scoring
- `game/src/kitchen.js` — the rules: orders, grill, plate, chef, scoring
- `game/src/render.js` — all the drawing: kitchen, food, chef, HUD, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised sound effects (WebAudio, no files)
- `game/src/shots.js` — deterministic screenshot scenes and the autopilot
- `game/src/random.js` — seeded random numbers
- `game/src/main.js` — the game loop and screens
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)
- `serve.ts` — a tiny static server for local play
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=jvcw07av&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
