// Sizzle & Serve — all the drawing: the kitchen, the food, the chef, the HUD
// and the screens. Canvas 2D only, no image assets: every sprite is vector art
// drawn here, so the game loads with no network request.
import {
  CANVAS,
  CHEF,
  INGREDIENTS,
  MAX_HEARTS,
  PLATE,
  SERVE,
  SHIFT_SECONDS,
  STARS,
  STATIONS,
} from './config.js';
import { clamp } from './random.js';
import { currentSpot, interactHint } from './kitchen.js';

const CREAM = '#f7ead0';
const WALL = '#f3e2c0';
const TEAL = '#2a9d8f';
const TEAL_DARK = '#1f7a70';
const WOOD = '#b07d4f';
const WOOD_DARK = '#8a5f36';
const COUNTER_TOP = '#e9d8b4';
const INK = '#3a2a1a';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** One ingredient icon, centred at (x, y), fitting in `size` pixels. */
export function drawIngredient(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'bun') {
    ctx.fillStyle = '#e8a54b';
    ctx.beginPath();
    ctx.arc(0, s * 0.28, s * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c47f2a';
    ctx.fillRect(-s * 0.95, s * 0.22, s * 1.9, s * 0.18);
    ctx.fillStyle = '#fff3d6';
    for (const [dx, dy] of [[-0.45, -0.35], [0, -0.55], [0.45, -0.35], [-0.2, -0.15], [0.25, -0.15]]) {
      circle(ctx, dx * s, dy * s, s * 0.09);
    }
  } else if (id === 'patty') {
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, -s, -s * 0.42, s * 2, s * 0.84, s * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#5d3a17';
    ctx.lineWidth = s * 0.12;
    for (const dx of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(dx * s, -s * 0.3);
      ctx.lineTo(dx * s, s * 0.3);
      ctx.stroke();
    }
  } else if (id === 'burned') {
    ctx.fillStyle = '#2b2b2b';
    roundRect(ctx, -s, -s * 0.42, s * 2, s * 0.84, s * 0.3);
    ctx.fill();
    ctx.fillStyle = '#555';
    circle(ctx, -s * 0.3, -s * 0.1, s * 0.14);
    circle(ctx, s * 0.35, s * 0.12, s * 0.11);
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#7ac74f';
    for (const dx of [-0.55, 0, 0.55]) circle(ctx, dx * s, 0, s * 0.55);
    ctx.fillStyle = '#4d8f2e';
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, s * 0.1);
    ctx.quadraticCurveTo(0, s * 0.55, s * 0.8, s * 0.1);
    ctx.lineTo(s * 0.8, -s * 0.1);
    ctx.quadraticCurveTo(0, s * 0.3, -s * 0.8, -s * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#e4572e';
    circle(ctx, 0, 0, s * 0.9);
    ctx.fillStyle = '#f28a6d';
    circle(ctx, 0, 0, s * 0.55);
    ctx.fillStyle = '#ffd9c9';
    for (const a of [0.3, 1.5, 2.7, 3.9, 5.1]) {
      circle(ctx, Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4, s * 0.1);
    }
    ctx.fillStyle = '#4d8f2e';
    ctx.fillRect(-s * 0.12, -s * 1.05, s * 0.24, s * 0.3);
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, s * 0.55);
    ctx.lineTo(s * 0.9, s * 0.55);
    ctx.lineTo(0, -s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9a41f';
    circle(ctx, -s * 0.3, s * 0.2, s * 0.14);
    circle(ctx, s * 0.25, s * 0.05, s * 0.11);
  } else if (id === 'sauce') {
    ctx.strokeStyle = '#ff8c42';
    ctx.lineWidth = s * 0.34;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, -s * 0.25);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.45, 0, -s * 0.25);
    ctx.quadraticCurveTo(s * 0.4, s * 0.45, s * 0.8, -s * 0.25);
    ctx.stroke();
    ctx.fillStyle = '#ff8c42';
    circle(ctx, -s * 0.8, s * 0.35, s * 0.16);
    circle(ctx, s * 0.8, s * 0.35, s * 0.16);
  }
  ctx.restore();
}

/** A burger built from `items`, stacked in kitchen order, centred at (x, y). */
function drawBurger(ctx, items, x, y, w) {
  const has = (id) => items.includes(id);
  const layerH = Math.max(7, w * 0.09);
  let cy = y + w * 0.16;
  ctx.save();
  ctx.translate(x, 0);
  // Bottom bun.
  if (has('bun')) {
    ctx.fillStyle = '#e8a54b';
    roundRect(ctx, -w / 2, cy - layerH, w, layerH * 1.5, layerH * 0.5);
    ctx.fill();
    cy -= layerH * 1.3;
  }
  const order = ['patty', 'cheese', 'lettuce', 'tomato'];
  for (const id of order) {
    if (!has(id)) continue;
    if (id === 'patty') {
      ctx.fillStyle = '#8a5a2b';
      roundRect(ctx, -w / 2, cy - layerH, w, layerH, layerH * 0.4);
      ctx.fill();
    } else if (id === 'cheese') {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-w / 2, cy);
      ctx.lineTo(w / 2, cy);
      ctx.lineTo(w / 2 - w * 0.08, cy - layerH);
      ctx.lineTo(-w / 2 + w * 0.08, cy - layerH);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'lettuce') {
      ctx.fillStyle = '#7ac74f';
      for (let i = 0; i < 5; i += 1) circle(ctx, -w / 2 + (i + 0.5) * (w / 5), cy - layerH * 0.5, layerH * 0.62);
    } else if (id === 'tomato') {
      ctx.fillStyle = '#e4572e';
      roundRect(ctx, -w / 2 + w * 0.06, cy - layerH, w * 0.88, layerH, layerH * 0.4);
      ctx.fill();
    }
    cy -= layerH * 0.85;
  }
  if (has('sauce')) {
    ctx.strokeStyle = '#ff8c42';
    ctx.lineWidth = layerH * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * 0.1, cy - layerH * 0.3);
    ctx.quadraticCurveTo(0, cy + layerH * 0.4, w / 2 - w * 0.1, cy - layerH * 0.3);
    ctx.stroke();
    cy -= layerH * 0.6;
  }
  // Top bun dome.
  if (has('bun')) {
    ctx.fillStyle = '#e8a54b';
    ctx.beginPath();
    ctx.arc(0, cy, w * 0.52, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    for (const [dx, dy] of [[-0.28, -0.28], [0, -0.42], [0.28, -0.28]]) {
      circle(ctx, dx * w, cy + dy * w, w * 0.035);
    }
  }
  ctx.restore();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : '#d8cbb2';
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx) {
  // Wall.
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, CANVAS.width, 340);
  // Tile band.
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(0, 300, CANVAS.width, 40);
  ctx.strokeStyle = '#d9c193';
  ctx.lineWidth = 2;
  for (let x = 0; x < CANVAS.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 300);
    ctx.lineTo(x, 340);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(CANVAS.width, 320);
  ctx.stroke();
  // Window with a sky view (left).
  ctx.fillStyle = '#bfe3f0';
  roundRect(ctx, 36, 96, 180, 150, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, 176, 130, 22);
  circle(ctx, 196, 138, 16);
  ctx.fillStyle = '#8ecae6';
  ctx.beginPath();
  ctx.moveTo(36, 246);
  ctx.lineTo(120, 170);
  ctx.lineTo(216, 246);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a5f36';
  ctx.lineWidth = 8;
  roundRect(ctx, 36, 96, 180, 150, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(126, 96);
  ctx.lineTo(126, 246);
  ctx.moveTo(36, 171);
  ctx.lineTo(216, 171);
  ctx.stroke();
  // Menu board (right of the tickets).
  ctx.fillStyle = '#3a2a1a';
  roundRect(ctx, 560, 84, 300, 76, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('— TODAY’S MENU —', 710, 112);
  ctx.fillStyle = '#f7ead0';
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('Classic · Cheese Melt · Garden · Deluxe', 710, 140);
  // Hanging lamps.
  for (const x of [340, 640, 940]) {
    ctx.strokeStyle = '#8a5f36';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 46);
    ctx.stroke();
    ctx.fillStyle = '#e4572e';
    ctx.beginPath();
    ctx.moveTo(x - 22, 58);
    ctx.lineTo(x + 22, 58);
    ctx.lineTo(x + 12, 40);
    ctx.lineTo(x - 12, 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    circle(ctx, x, 62, 7);
  }
  // Wood floor.
  ctx.fillStyle = '#c99a63';
  ctx.fillRect(0, 340, CANVAS.width, CANVAS.height - 340);
  ctx.strokeStyle = '#a87c48';
  ctx.lineWidth = 2;
  for (let y = 380; y < CANVAS.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS.width, y);
    ctx.stroke();
  }
  for (let x = 0; x < CANVAS.width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 340);
    ctx.lineTo(x - 30, CANVAS.height);
    ctx.stroke();
  }
  // Rug under the plate table.
  ctx.fillStyle = '#e4572e';
  ctx.beginPath();
  ctx.ellipse(640, 560, 150, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.ellipse(640, 560, 118, 24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawOrders(ctx, world) {
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText('ORDER BOARD', 18, 76);
  for (let i = 0; i < 3; i += 1) {
    const x = 16 + i * 182;
    const y = 84;
    const order = world.orders[i];
    ctx.fillStyle = order ? '#fffdf6' : '#efe3c8';
    roundRect(ctx, x, y, 170, 92, 10);
    ctx.fill();
    ctx.strokeStyle = order ? '#d9c193' : '#d9c193';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 170, 92, 10);
    ctx.stroke();
    if (!order) {
      ctx.fillStyle = '#b3a586';
      ctx.font = '13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('— waiting —', x + 85, y + 50);
      continue;
    }
    ctx.fillStyle = INK;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`#${order.id} ${order.recipe.name}`, x + 10, y + 22);
    const items = order.recipe.items;
    const iw = Math.min(26, Math.floor((170 - 20) / items.length) - 4);
    const total = items.length * (iw + 4);
    let ix = x + (170 - total) / 2 + iw / 2;
    for (const item of items) {
      const done = world.plate.includes(item);
      ctx.globalAlpha = done ? 0.35 : 1;
      drawIngredient(ctx, item, ix, y + 46, iw);
      ctx.globalAlpha = 1;
      ix += iw + 4;
    }
    // Patience bar.
    const frac = clamp(order.patience / order.maxPatience, 0, 1);
    ctx.fillStyle = '#e8dcc2';
    roundRect(ctx, x + 10, y + 70, 150, 10, 5);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#7ac74f' : frac > 0.25 ? '#f7c948' : '#e4572e';
    if (frac > 0) {
      roundRect(ctx, x + 10, y + 70, 150 * frac, 10, 5);
      ctx.fill();
    }
  }
  // Level and dishes, right of the board.
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`LEVEL ${world.level}`, 1264, 92);
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillText(`Dishes served: ${world.dishes}`, 1264, 114);
  ctx.fillText(`Orders lost: ${world.expired}`, 1264, 136);
}

function drawStations(ctx, world) {
  for (const station of STATIONS) {
    if (station.kind === 'grill') {
      const x0 = station.x - station.width / 2;
      // Griddle body.
      ctx.fillStyle = WOOD_DARK;
      roundRect(ctx, x0 - 8, 246, station.width + 16, 118, 10);
      ctx.fill();
      ctx.fillStyle = '#4a4a52';
      roundRect(ctx, x0, 252, station.width, 84, 8);
      ctx.fill();
      ctx.strokeStyle = '#33333a';
      ctx.lineWidth = 2;
      for (let i = 1; i < 6; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x0 + (station.width / 6) * i, 254);
        ctx.lineTo(x0 + (station.width / 6) * i, 334);
        ctx.stroke();
      }
      // Slots.
      for (let s = 0; s < world.grill.length; s += 1) {
        const slot = world.grill[s];
        const cx = station.x - 52 + s * 104;
        const cy = 294;
        if (slot.state === 'empty') {
          ctx.fillStyle = '#5a5a62';
          ctx.font = '12px "Trebuchet MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('—', cx, cy + 4);
        } else {
          const frac = slot.state === 'cooking' ? clamp(slot.t / 4, 0, 1) : 1;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, 0.8);
          ctx.fillStyle = slot.state === 'burned' ? '#222' : slot.state === 'cooked' ? '#6b4423' : '#c97e7e';
          ctx.beginPath();
          ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (slot.state === 'cooking') {
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(cx, cy - 30, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#ffd166';
            ctx.stroke();
          }
          if (slot.state === 'cooked') {
            ctx.fillStyle = '#ffd166';
            ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('READY!', cx, cy - 26);
          }
          if (slot.state === 'burned') {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BURNT!', cx, cy - 26);
          }
        }
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GRILL', station.x, 356);
      continue;
    }
    const w = 128;
    const x0 = station.x - w / 2;
    // Counter block.
    ctx.fillStyle = station.kind === 'trash' ? '#6b6b72' : TEAL;
    roundRect(ctx, x0, 252, w, 112, 10);
    ctx.fill();
    ctx.fillStyle = COUNTER_TOP;
    roundRect(ctx, x0 - 6, 240, w + 12, 18, 8);
    ctx.fill();
    if (station.kind === 'bin') {
      // The ingredient sits in its bin, on the counter.
      drawIngredient(ctx, station.ingredient, station.x, 284, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(station.label, station.x, 322);
      ctx.font = '11px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#d7efe9';
      ctx.fillText(INGREDIENTS[station.ingredient].chop ? 'hold E to chop' : 'tap E to take', station.x, 340);
    } else if (station.kind === 'trash') {
      ctx.fillStyle = '#3a3a40';
      roundRect(ctx, station.x - 26, 258, 52, 40, 6);
      ctx.fill();
      ctx.fillStyle = '#8a8a92';
      roundRect(ctx, station.x - 30, 252, 60, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRASH', station.x, 322);
      ctx.font = '11px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#e8e8ec';
      ctx.fillText('E to toss', station.x, 340);
    }
  }
}

function drawPlateTable(ctx, world) {
  // Round table.
  ctx.fillStyle = WOOD_DARK;
  ctx.fillRect(PLATE.x - 12, PLATE.y + 40, 24, 66);
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.ellipse(PLATE.x, PLATE.y + 42, PLATE.width / 2, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e8ec';
  ctx.beginPath();
  ctx.ellipse(PLATE.x, PLATE.y + 30, 74, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c9d2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(PLATE.x, PLATE.y + 30, 74, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  // The dish mid-assembly.
  if (world.plate.length > 0) {
    drawBurger(ctx, world.plate, PLATE.x, PLATE.y + 4, 110);
  } else {
    ctx.fillStyle = '#9a9aa2';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('empty plate', PLATE.x, PLATE.y + 12);
  }
  // Ready glow.
  if (world.plateReady) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(PLATE.x, PLATE.y + 30, 82, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#7a5b00';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('READY TO SERVE!', PLATE.x, PLATE.y - 100);
  }
  ctx.fillStyle = INK;
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ASSEMBLY PLATE', PLATE.x, PLATE.y + 78);
}

function drawServeWindow(ctx, world) {
  const x0 = SERVE.x - SERVE.width / 2;
  // Hatch in the wall.
  ctx.fillStyle = '#3a2a1a';
  roundRect(ctx, x0 - 10, 196, SERVE.width + 20, 150, 10);
  ctx.fill();
  ctx.fillStyle = '#e8b25e';
  roundRect(ctx, x0, 206, SERVE.width, 120, 8);
  ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SERVICE', SERVE.x, 232);
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#6b4a1a';
  ctx.fillText('ring the bell!', SERVE.x, 254);
  // Bell on the ledge.
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.arc(SERVE.x, 316, 16, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(SERVE.x - 3, 300, 6, 6);
  ctx.fillStyle = '#8a6d1a';
  circle(ctx, SERVE.x, 322, 4);
  // Ledge.
  ctx.fillStyle = COUNTER_TOP;
  roundRect(ctx, x0 - 14, 330, SERVE.width + 28, 16, 8);
  ctx.fill();
  // Flash when a plate is ready.
  if (world.plateReady) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 5;
    roundRect(ctx, x0 - 10, 196, SERVE.width + 20, 150, 10);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SERVE  · E ·', SERVE.x, 366);
}

function drawChef(ctx, world) {
  const chef = world.chef;
  const x = chef.x;
  const y = chef.y;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 3 : 0;
  const flip = chef.facing < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale(flip, 1);
  // Legs.
  const legSwing = chef.moving ? Math.sin(chef.walkPhase) * 8 : 0;
  ctx.fillStyle = '#3a3a44';
  roundRect(ctx, -14 + legSwing, -34, 11, 34, 4);
  ctx.fill();
  roundRect(ctx, 3 - legSwing, -34, 11, 34, 4);
  ctx.fill();
  // Apron body.
  ctx.fillStyle = '#fffdf6';
  roundRect(ctx, -22, -86, 44, 56, 12);
  ctx.fill();
  ctx.fillStyle = TEAL;
  roundRect(ctx, -22, -86, 44, 14, 6);
  ctx.fill();
  ctx.fillStyle = '#e4572e';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHEF', 0, -64);
  // Arms.
  ctx.fillStyle = '#f2c89b';
  circle(ctx, -24, -58, 7);
  circle(ctx, 24, -58, 7);
  // Head.
  ctx.fillStyle = '#f2c89b';
  circle(ctx, 0, -100, 17);
  // Toque.
  ctx.fillStyle = '#fff';
  circle(ctx, -11, -114, 10);
  circle(ctx, 0, -118, 12);
  circle(ctx, 11, -114, 10);
  ctx.fillRect(-14, -116, 28, 8);
  // Face.
  ctx.fillStyle = INK;
  circle(ctx, 6, -102, 2.2);
  circle(ctx, 13, -102, 2.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(9, -95, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  // Carried item above the head.
  if (chef.carrying) {
    const cy = y - 142 - bob;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(ctx, x, cy, 24);
    ctx.strokeStyle = '#d9c193';
    ctx.lineWidth = 2;
    circle(ctx, x, cy, 24);
    ctx.stroke();
    drawIngredient(ctx, chef.carrying, x, cy, 34);
  }
  // Chopping progress ring.
  if (chef.chopping && chef.chop > 0) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y - 60, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chef.chop);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHOP!', x, y - 100);
  }
  // Hint bubble.
  const hint = interactHint(world);
  const spot = currentSpot(world);
  if (hint && spot && !world.over) {
    ctx.fillStyle = 'rgba(58,42,26,0.92)';
    const w = ctx.measureText(hint).width + 34;
    roundRect(ctx, x - w / 2, y - 178, w, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hint, x, y - 160);
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const a = 1 - p.t / p.life;
    if (p.kind === 'steam' || p.kind === 'smoke') {
      ctx.fillStyle = p.kind === 'steam' ? `rgba(255,255,255,${0.55 * a})` : `rgba(90,90,90,${0.55 * a})`;
      circle(ctx, p.x, p.y, p.size * (1 + p.t));
    } else if (p.kind === 'star') {
      ctx.fillStyle = `rgba(255,209,102,${a})`;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.t * 4);
      ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
      ctx.fillRect(-p.size / 6, -p.size / 2, p.size / 3, p.size);
      ctx.restore();
    } else if (p.kind === 'leaf') {
      ctx.fillStyle = `rgba(122,199,79,${a})`;
      circle(ctx, p.x, p.y, p.size * 0.6);
    } else {
      ctx.fillStyle = `rgba(255,255,255,${0.7 * a})`;
      circle(ctx, p.x, p.y, p.size * 0.5);
    }
  }
  for (const p of world.popups) {
    const a = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(58,42,26,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillText(p.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, CANVAS.width, 58);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
  ctx.fillText('SIZZLE & SERVE', 16, 38);
  // Timer (centre).
  const mins = Math.floor(world.timeLeft / 60);
  const secs = Math.floor(world.timeLeft % 60);
  const urgent = world.timeLeft <= 30;
  const frac = clamp(world.timeLeft / SHIFT_SECONDS, 0, 1);
  ctx.fillStyle = urgent ? '#ff6b6b' : '#fff';
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 640, 40);
  ctx.fillStyle = '#5a4632';
  roundRect(ctx, 560, 46, 160, 6, 3);
  ctx.fill();
  ctx.fillStyle = urgent ? '#ff6b6b' : '#7ac74f';
  if (frac > 0) {
    roundRect(ctx, 560, 46, 160 * frac, 6, 3);
    ctx.fill();
  }
  // Score, coins, hearts, combo (right).
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.fillText(`SCORE ${world.score}`, 1010, 30);
  ctx.fillStyle = '#ffd166';
  circle(ctx, 1030, 24, 9);
  ctx.fillStyle = '#8a6d1a';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('$', 1030, 28);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${world.coins}`, 1046, 30);
  for (let i = 0; i < MAX_HEARTS; i += 1) {
    drawHeart(ctx, 1120 + i * 30, 26, 24, i < world.hearts);
  }
  if (world.combo >= 2) {
    ctx.fillStyle = '#ff8c42';
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO x${world.combo}`, 1264, 52);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(30,20,10,0.72)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffd166';
  ctx.font = 'bold 54px "Trebuchet MS", sans-serif';
  ctx.fillText(title, CANVAS.width / 2, 250);
  ctx.fillStyle = '#fff';
  ctx.font = '20px "Trebuchet MS", sans-serif';
  let y = 300;
  for (const line of lines) {
    ctx.fillText(line, CANVAS.width / 2, y);
    y += 32;
  }
}

function starsFor(score) {
  if (score >= STARS.three) return 3;
  if (score >= STARS.two) return 2;
  if (score >= STARS.one) return 1;
  return 0;
}

/** Draw the whole frame. `screen` is title | play | pause | over. */
export function drawGame(ctx, world, screen, ui) {
  drawBackground(ctx);
  drawOrders(ctx, world);
  drawStations(ctx, world);
  drawPlateTable(ctx, world);
  drawServeWindow(ctx, world);
  drawChef(ctx, world);
  drawParticles(ctx, world);
  drawHud(ctx, world);
  if (screen === 'title') {
    overlay(ctx, 'SIZZLE & SERVE', [
      'A 150-second dinner rush. Cook burgers, beat the clock.',
      '',
      '← →  move      W / S  switch lane      E  cook · chop · serve',
      'Mouse: click a station to walk there',
      '',
      'Grill the patty, chop the salad, stack the burger, ring the bell!',
      '',
      'Press ENTER to start',
    ]);
    if (ui.best > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Best score: ${ui.best}`, CANVAS.width / 2, 560);
    }
  } else if (screen === 'pause') {
    overlay(ctx, 'PAUSED', ['Press P to keep cooking', 'M to mute · R to restart']);
  } else if (screen === 'over') {
    const stars = starsFor(world.score);
    const title = world.won ? 'SHIFT OVER!' : 'OUT OF HEARTS!';
    const lines = [
      `Score ${world.score}   ·   Dishes served ${world.dishes}   ·   Best combo x${world.bestCombo}`,
      `Orders lost ${world.expired}   ·   Level reached ${world.level}`,
      '',
      '★'.repeat(stars) + '☆'.repeat(3 - stars),
      '',
      'Press R to play again',
    ];
    overlay(ctx, title, lines, world.won ? '#7ac74f' : '#ff6b6b');
  }
  if (ui.muted) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MUTED (M)', 16, 700);
  }
}
