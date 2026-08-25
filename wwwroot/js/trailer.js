import { createRng, randRange, randInt, pick } from "./rng.js";

export const WIDTH = 480;
export const HEIGHT = 270;

// Shared by the live preview (detail.js) and the page export (export.js) so
// both always derive the exact same seed for the exact same movie.
export function buildTrailerSeed(movieState, movie) {
  return `${movieState.seed}:${movieState.lang}:${movie.index}:${movie.title}`;
}

const LETTERBOX_HEIGHT = 20;
const CUT_FLASH_DURATION = 90;
const TITLE_FONT = "bold 28px Georgia, 'Times New Roman', serif";
const TAGLINE_FONT = "italic 15px Georgia, 'Times New Roman', serif";

const PALETTES = [
  { bg1: "#0b1d3a", bg2: "#1c4b82", accent: "#ffd166", accent2: "#ef476f" },
  { bg1: "#2b0a3d", bg2: "#6a1b9a", accent: "#00e5ff", accent2: "#ff6d00" },
  { bg1: "#0d1f16", bg2: "#1f5e3c", accent: "#f4f1de", accent2: "#e07a5f" },
  { bg1: "#241623", bg2: "#5c2a4d", accent: "#ffb703", accent2: "#8ecae6" },
  { bg1: "#1a1423", bg2: "#3d2c8d", accent: "#ff477e", accent2: "#00f5d4" },
  { bg1: "#101820", bg2: "#3f4e4f", accent: "#f4d35e", accent2: "#ee964b" },
];

const TAGLINES = [
  "IN A WORLD ON THE EDGE",
  "EVERY LEGEND HAS A BEGINNING",
  "NOTHING IS WHAT IT SEEMS",
  "SOME STORIES NEVER END",
  "ONE NIGHT WILL CHANGE EVERYTHING",
  "THE TRUTH IS COMING",
  "DESTINY HAS A NAME",
  "IT ALL BEGINS NOW",
  "PREPARE FOR THE UNKNOWN",
  "FEAR HAS A NEW FACE",
];

const SCENE_TYPES = ["starfield", "nebula", "streaks", "shockwave", "geometry"];

// ---------- math / color helpers ----------

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function wrap(value, max) {
  const m = value % max;
  return m < 0 ? m + max : m;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shuffle(rng, array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function trackedText(text) {
  return text.split("").join("  ");
}

// ---------- scene builders (seeded content per scene type) ----------

function buildStarfield(rng) {
  const stars = Array.from({ length: randInt(rng, 70, 110) }, () => ({
    x: randRange(rng, 0, WIDTH),
    y: randRange(rng, 0, HEIGHT),
    depth: randRange(rng, 0.15, 1),
    twinkleSpeed: randRange(rng, 1, 3),
    twinklePhase: randRange(rng, 0, Math.PI * 2),
  }));
  return { stars, driftAngle: randRange(rng, 0, Math.PI * 2) };
}

function buildNebula(rng) {
  const blobs = Array.from({ length: randInt(rng, 3, 5) }, () => ({
    x: randRange(rng, WIDTH * 0.1, WIDTH * 0.9),
    y: randRange(rng, HEIGHT * 0.1, HEIGHT * 0.9),
    radius: randRange(rng, 60, 140),
    speedX: randRange(rng, -6, 6),
    speedY: randRange(rng, -4, 4),
    colorMix: rng(),
    pulseSpeed: randRange(rng, 0.2, 0.6),
  }));
  return { blobs };
}

function buildStreaks(rng) {
  const streaks = Array.from({ length: randInt(rng, 8, 14) }, () => ({
    y: randRange(rng, 0, HEIGHT),
    length: randRange(rng, 60, 180),
    speed: randRange(rng, 90, 220),
    thickness: randRange(rng, 1, 3.5),
    offset: randRange(rng, 0, WIDTH),
    colorMix: rng(),
  }));
  return { streaks, angle: randRange(rng, -0.35, 0.35) };
}

function buildShockwave(rng) {
  const pulses = Array.from({ length: randInt(rng, 4, 6) }, (_, i) => ({
    startDelay: randRange(rng, 0, 1.4) + i * 0.35,
    originX: randRange(rng, WIDTH * 0.3, WIDTH * 0.7),
    originY: randRange(rng, HEIGHT * 0.3, HEIGHT * 0.7),
  }));
  return {
    pulses,
    rayCount: randInt(rng, 10, 18),
    rotationSpeed: randRange(rng, -0.5, 0.5),
  };
}

function buildGeometry(rng) {
  const shapeCount = randInt(rng, 6, 10);
  const shapes = Array.from({ length: shapeCount }, () => ({
    sides: pick(rng, [3, 4, 6]),
    size: randRange(rng, 10, 26),
    targetX: randRange(rng, WIDTH * 0.25, WIDTH * 0.75),
    targetY: randRange(rng, HEIGHT * 0.25, HEIGHT * 0.75),
    startAngle: randRange(rng, 0, Math.PI * 2),
    spin: randRange(rng, -1.2, 1.2),
    burstAngle: randRange(rng, 0, Math.PI * 2),
    burstDistance: randRange(rng, 120, 260),
    colorMix: rng(),
  }));
  return { shapes };
}

const SCENE_BUILDERS = {
  starfield: buildStarfield,
  nebula: buildNebula,
  streaks: buildStreaks,
  shockwave: buildShockwave,
  geometry: buildGeometry,
};

function buildCamera(rng) {
  const zoomIn = rng() > 0.35;
  return {
    zoomFrom: randRange(rng, 1.0, 1.06),
    zoomTo: zoomIn ? randRange(rng, 1.16, 1.36) : randRange(rng, 0.92, 1.0),
    panFromX: randRange(rng, -18, 18),
    panFromY: randRange(rng, -12, 12),
    panToX: randRange(rng, -18, 18),
    panToY: randRange(rng, -12, 12),
  };
}

function buildSceneInstance(rng, type) {
  return {
    type,
    camera: buildCamera(rng),
    gradientAngle: randRange(rng, 0, Math.PI * 2),
    ...SCENE_BUILDERS[type](rng),
  };
}

function buildGrainTile(rng, size = 96) {
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d");
  const imageData = tctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  tctx.putImageData(imageData, 0, 0);
  return tile;
}

// ---------- trailer plan (fully seeded/deterministic) ----------

export function buildTrailerPlan(seedString, title) {
  const rng = createRng(seedString);
  const palette = pick(rng, PALETTES);
  const tagline = pick(rng, TAGLINES);

  const sceneTypes = shuffle(rng, SCENE_TYPES).slice(0, 3);
  const beatsPerScene = sceneTypes.map(() => randInt(rng, 1, 2));

  const totalDuration = randRange(rng, 5800, 9200);
  const studioCardDuration = randRange(rng, 750, 1050);
  const titleImpactDuration = randRange(rng, 500, 650);
  const titlePhaseDuration = randRange(rng, 1700, 2300);

  const sceneTotalDuration = Math.max(1500, totalDuration - studioCardDuration - titlePhaseDuration);
  const beatsCountTotal = beatsPerScene.reduce((a, b) => a + b, 0);
  const beatDuration = Math.max(350, sceneTotalDuration / beatsCountTotal);

  const scenes = sceneTypes.map((type) => buildSceneInstance(rng, type));
  scenes.forEach((scene, i) => {
    scene.durationMs = beatsPerScene[i] * beatDuration;
  });

  const sceneStarts = [];
  let cursor = 0;
  for (const scene of scenes) {
    sceneStarts.push(cursor);
    cursor += scene.durationMs;
  }

  const scenesStart = studioCardDuration;
  const titleRevealStart = scenesStart + cursor;
  const titleHoldStart = titleRevealStart + titleImpactDuration;
  const holdDuration = Math.max(400, titleRevealStart + titlePhaseDuration - titleHoldStart);
  const titleSweepDuration = Math.min(420, Math.max(150, holdDuration * 0.35));
  const titleSweepStart = titleHoldStart + holdDuration * randRange(rng, 0.25, 0.55);

  const cutTimes = [studioCardDuration];
  for (let i = 1; i < scenes.length; i++) cutTimes.push(scenesStart + sceneStarts[i]);
  cutTimes.push(titleRevealStart);

  const hueRotate = randInt(rng, 0, 359);
  const saturate = randRange(rng, 1.05, 1.55);
  const brightness = randRange(rng, 0.92, 1.08);
  const contrast = randRange(rng, 1.12, 1.32);

  const audioRng = createRng(seedString + ":audio");

  return {
    title,
    tagline,
    palette,
    studioCardDuration,
    scenesStart,
    scenes,
    sceneStarts,
    titleRevealStart,
    titleImpactDuration,
    titleHoldStart,
    titleSweepStart,
    titleSweepDuration,
    totalDuration: titleRevealStart + titlePhaseDuration,
    beatDuration,
    cutTimes,
    filter: `contrast(${contrast.toFixed(2)}) saturate(${saturate.toFixed(2)}) brightness(${brightness.toFixed(2)}) hue-rotate(${hueRotate}deg)`,
    grainTile: buildGrainTile(rng),
    audio: {
      droneFreq: randRange(audioRng, 48, 90),
      droneType: pick(audioRng, ["sine", "triangle"]),
    },
  };
}

// ---------- scene drawers ----------

function drawBackgroundGradient(ctx, palette, angle) {
  const x1 = WIDTH / 2 + Math.cos(angle) * WIDTH;
  const y1 = HEIGHT / 2 + Math.sin(angle) * HEIGHT;
  const x2 = WIDTH / 2 - Math.cos(angle) * WIDTH;
  const y2 = HEIGHT / 2 - Math.sin(angle) * HEIGHT;
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, palette.bg1);
  gradient.addColorStop(1, palette.bg2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawStarfield(ctx, scene, palette, tSeconds) {
  const dx = Math.cos(scene.driftAngle);
  const dy = Math.sin(scene.driftAngle);
  for (const s of scene.stars) {
    // depth drives both parallax speed and size/brightness -> sense of dolly-through-space
    const speed = 12 + s.depth * 46;
    const x = wrap(s.x + dx * speed * tSeconds, WIDTH);
    const y = wrap(s.y + dy * speed * tSeconds, HEIGHT);
    const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(tSeconds * s.twinkleSpeed + s.twinklePhase));
    const radius = 0.5 + s.depth * 1.8;
    ctx.beginPath();
    ctx.fillStyle = s.depth > 0.6 ? "#ffffff" : palette.accent;
    ctx.globalAlpha = twinkle * (0.3 + s.depth * 0.7);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx, scene, palette, tSeconds) {
  ctx.globalCompositeOperation = "lighter";
  for (const b of scene.blobs) {
    const x = b.x + b.speedX * tSeconds * 10;
    const y = b.y + b.speedY * tSeconds * 10;
    const pulse = 1 + Math.sin(tSeconds * b.pulseSpeed) * 0.15;
    const color = b.colorMix > 0.5 ? palette.accent : palette.accent2;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, b.radius * pulse);
    grad.addColorStop(0, hexToRgba(color, 0.35));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, b.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawStreaks(ctx, scene, palette, tSeconds) {
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(scene.angle);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);
  for (const s of scene.streaks) {
    const headX = wrap(s.offset + tSeconds * s.speed, WIDTH + s.length) - s.length / 2;
    const color = s.colorMix > 0.5 ? palette.accent : palette.accent2;
    const grad = ctx.createLinearGradient(headX - s.length, s.y, headX, s.y);
    grad.addColorStop(0, hexToRgba(color, 0));
    grad.addColorStop(1, hexToRgba(color, 0.85));
    ctx.strokeStyle = grad;
    ctx.lineWidth = s.thickness;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(headX - s.length, s.y);
    ctx.lineTo(headX, s.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawShockwave(ctx, scene, palette, tSeconds) {
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(tSeconds * scene.rotationSpeed);
  for (let i = 0; i < scene.rayCount; i++) {
    const angle = (Math.PI * 2 * i) / scene.rayCount;
    ctx.strokeStyle = i % 2 === 0 ? palette.accent : palette.accent2;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * WIDTH, Math.sin(angle) * WIDTH);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  for (const p of scene.pulses) {
    const life = tSeconds - p.startDelay;
    if (life < 0) continue;
    const cycle = 1.8;
    const t = (life % cycle) / cycle;
    const radius = t * WIDTH * 0.75;
    const alpha = (1 - t) * 0.5;
    if (alpha <= 0) continue;
    ctx.beginPath();
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.5;
    ctx.arc(p.originX, p.originY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPolygonPath(ctx, cx, cy, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (Math.PI * 2 * i) / sides;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawGeometry(ctx, scene, palette, tSeconds, progress) {
  // first half: shapes converge into formation. second half: formation breaks apart.
  const buildEase = easeOutCubic(clamp01(progress / 0.5));
  const breakEase = easeInCubic(clamp01((progress - 0.55) / 0.45));
  for (const shape of scene.shapes) {
    const startX = shape.targetX + Math.cos(shape.burstAngle) * 200;
    const startY = shape.targetY + Math.sin(shape.burstAngle) * 200;
    let x = lerp(startX, shape.targetX, buildEase);
    let y = lerp(startY, shape.targetY, buildEase);
    if (breakEase > 0) {
      x = shape.targetX + Math.cos(shape.burstAngle) * shape.burstDistance * breakEase;
      y = shape.targetY + Math.sin(shape.burstAngle) * shape.burstDistance * breakEase;
    }
    const alpha = breakEase > 0 ? Math.max(0, 1 - breakEase) : buildEase;
    if (alpha <= 0) continue;
    const rotation = shape.startAngle + tSeconds * shape.spin;
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = shape.colorMix > 0.5 ? palette.accent : palette.accent2;
    ctx.lineWidth = 2;
    drawPolygonPath(ctx, x, y, shape.size, shape.sides, rotation);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const SCENE_DRAWERS = {
  starfield: drawStarfield,
  nebula: drawNebula,
  streaks: drawStreaks,
  shockwave: drawShockwave,
  geometry: drawGeometry,
};

function drawScene(ctx, scene, palette, localMs) {
  const tSeconds = localMs / 1000;
  const progress = clamp01(localMs / scene.durationMs);
  const eased = easeInOutCubic(progress); // slow start -> fast middle -> settle: Ken Burns feel
  const zoom = lerp(scene.camera.zoomFrom, scene.camera.zoomTo, eased);
  const panX = lerp(scene.camera.panFromX, scene.camera.panToX, eased);
  const panY = lerp(scene.camera.panFromY, scene.camera.panToY, eased);

  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-WIDTH / 2 + panX, -HEIGHT / 2 + panY);
  drawBackgroundGradient(ctx, palette, scene.gradientAngle);
  SCENE_DRAWERS[scene.type](ctx, scene, palette, tSeconds, eased);
  ctx.restore();
}

function findSceneIndexAt(plan, localT) {
  for (let i = 0; i < plan.scenes.length; i++) {
    const end = plan.sceneStarts[i] + plan.scenes[i].durationMs;
    if (localT < end) return i;
  }
  return plan.scenes.length - 1;
}

// ---------- grading / texture ----------

function applyGradeOverlay(ctx, palette) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.18;
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, palette.bg2);
  grad.addColorStop(1, palette.accent2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT / 3.2, WIDTH / 2, HEIGHT / 2, WIDTH / 1.15);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.25)");
  gradient.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawFilmGrain(ctx, plan, tSeconds) {
  const tile = plan.grainTile;
  const pattern = ctx.createPattern(tile, "repeat");
  const offsetX = Math.sin(tSeconds * 13.1) * tile.width;
  const offsetY = Math.cos(tSeconds * 9.7) * tile.height;
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.globalCompositeOperation = "overlay";
  ctx.translate(offsetX, offsetY);
  ctx.fillStyle = pattern;
  ctx.fillRect(-offsetX, -offsetY, WIDTH, HEIGHT);
  ctx.restore();
}

function drawLetterbox(ctx) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, LETTERBOX_HEIGHT);
  ctx.fillRect(0, HEIGHT - LETTERBOX_HEIGHT, WIDTH, LETTERBOX_HEIGHT);
}

function nearestCutOffset(plan, tMs) {
  let best = null;
  for (const cut of plan.cutTimes) {
    const diff = tMs - cut;
    if (diff >= 0 && (best === null || diff < best)) best = diff;
  }
  return best;
}

function drawCutFlash(ctx, plan, tMs) {
  const offset = nearestCutOffset(plan, tMs);
  if (offset === null || offset > CUT_FLASH_DURATION) return;
  ctx.save();
  ctx.globalAlpha = (1 - offset / CUT_FLASH_DURATION) * 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

// ---------- title card ----------

let sweepCanvas = null;
function getSweepCanvas() {
  if (!sweepCanvas) {
    sweepCanvas = document.createElement("canvas");
    sweepCanvas.width = WIDTH;
    sweepCanvas.height = HEIGHT;
  }
  return sweepCanvas;
}

function drawTitleSweep(ctx, plan, scale, dx, dy, sweepT) {
  const off = getSweepCanvas();
  const octx = off.getContext("2d");
  octx.clearRect(0, 0, WIDTH, HEIGHT);
  octx.save();
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.font = TITLE_FONT;
  octx.translate(WIDTH / 2 + dx, HEIGHT / 2 + dy);
  octx.scale(scale, scale);
  octx.fillStyle = "#ffffff";
  octx.fillText(plan.title, 0, 0);
  octx.restore();

  octx.globalCompositeOperation = "source-atop";
  const sweepX = -WIDTH * 0.4 + sweepT * WIDTH * 1.8;
  const grad = octx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  octx.fillStyle = grad;
  octx.fillRect(0, 0, WIDTH, HEIGHT);
  octx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.9;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

function drawTitleCard(ctx, plan, impactT, tSeconds, sweepT) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = TITLE_FONT;

  const clampedImpact = clamp01(impactT);
  const scale = lerp(0.55, 1, easeOutBack(clampedImpact)); // slight overshoot then settle
  const alpha = clamp01(impactT / 0.6);
  const shakeAmp = clampedImpact < 1 ? (1 - clampedImpact) * 4 : 0;
  const dx = shakeAmp ? Math.sin(tSeconds * 47) * shakeAmp : 0;
  const dy = shakeAmp ? Math.cos(tSeconds * 53) * shakeAmp * 0.6 : 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = plan.palette.accent;
  ctx.shadowBlur = 10 + Math.sin(tSeconds * 2) * 3;
  ctx.translate(WIDTH / 2 + dx, HEIGHT / 2 + dy);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(plan.title, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;

  if (sweepT !== null && sweepT !== undefined) {
    drawTitleSweep(ctx, plan, scale, dx, dy, sweepT);
  }
}

function drawStudioCard(ctx, plan, tMs) {
  const t = clamp01(tMs / plan.studioCardDuration);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const fadeIn = clamp01(t / 0.35);
  const fadeOut = clamp01((t - 0.75) / 0.25);
  ctx.save();
  ctx.globalAlpha = Math.min(fadeIn, 1 - fadeOut);
  ctx.fillStyle = plan.palette.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = TAGLINE_FONT;
  ctx.shadowColor = plan.palette.accent;
  ctx.shadowBlur = 8;
  ctx.fillText(trackedText(plan.tagline), WIDTH / 2, HEIGHT / 2);
  ctx.restore();

  drawFilmGrain(ctx, plan, tMs / 1000);
  drawVignette(ctx);
  drawLetterbox(ctx);
}

// ---------- frame assembly ----------

function drawFrame(ctx, plan, tMs) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (tMs < plan.studioCardDuration) {
    drawStudioCard(ctx, plan, tMs);
    return;
  }

  if (tMs < plan.titleRevealStart) {
    const localT = tMs - plan.scenesStart;
    const idx = findSceneIndexAt(plan, localT);
    const scene = plan.scenes[idx];
    ctx.filter = plan.filter;
    drawScene(ctx, scene, plan.palette, localT - plan.sceneStarts[idx]);
    ctx.filter = "none";
    applyGradeOverlay(ctx, plan.palette);
    drawVignette(ctx);
    drawFilmGrain(ctx, plan, tMs / 1000);
    drawCutFlash(ctx, plan, tMs);
    drawLetterbox(ctx);
    return;
  }

  // title phase: last scene keeps drifting softly behind the card, camera settled
  const lastScene = plan.scenes[plan.scenes.length - 1];
  const driftMs = lastScene.durationMs + (tMs - plan.titleRevealStart) * 0.2;
  ctx.filter = plan.filter;
  drawScene(ctx, lastScene, plan.palette, driftMs);
  ctx.filter = "none";
  applyGradeOverlay(ctx, plan.palette);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawVignette(ctx);
  drawFilmGrain(ctx, plan, tMs / 1000);
  drawCutFlash(ctx, plan, tMs);
  drawLetterbox(ctx);

  const impactT = (tMs - plan.titleRevealStart) / plan.titleImpactDuration;
  const inSweep = tMs >= plan.titleSweepStart && tMs <= plan.titleSweepStart + plan.titleSweepDuration;
  const sweepT = inSweep ? clamp01((tMs - plan.titleSweepStart) / plan.titleSweepDuration) : null;
  drawTitleCard(ctx, plan, impactT, tMs / 1000, sweepT);
}

export function drawFreezeFrame(canvas, plan) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const scene = plan.scenes[0];
  ctx.filter = plan.filter;
  drawScene(ctx, scene, plan.palette, scene.durationMs * 0.4);
  ctx.filter = "none";
  applyGradeOverlay(ctx, plan.palette);
  drawVignette(ctx);
  drawFilmGrain(ctx, plan, 0.4);
  drawLetterbox(ctx);
  drawTitleCard(ctx, plan, 1, 0, null);
}

// ---------- optional seeded WebAudio pulse/drone, synced to cuts ----------

let sharedAudioCtx = null;
function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  return sharedAudioCtx;
}

function startAudio(plan) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime + 0.02;
    const totalS = plan.totalDuration / 1000;
    const nodes = [];

    const droneOsc = ctx.createOscillator();
    droneOsc.type = plan.audio.droneType;
    droneOsc.frequency.setValueAtTime(plan.audio.droneFreq, now);
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.setValueAtTime(400, now);
    droneFilter.frequency.linearRampToValueAtTime(900, now + totalS * 0.6);
    droneFilter.frequency.linearRampToValueAtTime(300, now + totalS);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.07, now + 0.4);
    droneGain.gain.setValueAtTime(0.07, now + Math.max(0.4, totalS - 0.4));
    droneGain.gain.linearRampToValueAtTime(0, now + totalS);
    droneOsc.connect(droneFilter).connect(droneGain).connect(ctx.destination);
    droneOsc.start(now);
    droneOsc.stop(now + totalS + 0.05);
    nodes.push(droneOsc);

    for (const cutMs of plan.cutTimes) {
      const t = now + cutMs / 1000;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      const startFreq = plan.audio.droneFreq * 4;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, startFreq * 0.3), t + 0.18);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
      nodes.push(osc);
    }

    const sweepT = now + plan.titleSweepStart / 1000;
    const sweepOsc = ctx.createOscillator();
    sweepOsc.type = "sine";
    sweepOsc.frequency.setValueAtTime(plan.audio.droneFreq * 8, sweepT);
    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0.0001, sweepT);
    sweepGain.gain.exponentialRampToValueAtTime(0.05, sweepT + 0.15);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, sweepT + plan.titleSweepDuration / 1000);
    sweepOsc.connect(sweepGain).connect(ctx.destination);
    sweepOsc.start(sweepT);
    sweepOsc.stop(sweepT + plan.titleSweepDuration / 1000 + 0.05);
    nodes.push(sweepOsc);

    let stopped = false;
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        const stopTime = ctx.currentTime;
        for (const node of nodes) {
          try {
            node.stop(stopTime);
          } catch (e) {
            // already stopped naturally, ignore
          }
        }
      },
    };
  } catch (e) {
    return null;
  }
}

// ---------- playback ----------

export function playTrailer(canvas, plan, onEnd, { audio: audioEnabled = true } = {}) {
  const ctx = canvas.getContext("2d");
  const startTime = performance.now();
  const audio = audioEnabled ? startAudio(plan) : null;
  let rafId;

  function frame(now) {
    const elapsed = now - startTime;
    if (elapsed >= plan.totalDuration) {
      drawFrame(ctx, plan, plan.totalDuration);
      if (audio) audio.stop();
      onEnd();
      return;
    }
    drawFrame(ctx, plan, elapsed);
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(rafId);
    if (audio) audio.stop();
  };
}
