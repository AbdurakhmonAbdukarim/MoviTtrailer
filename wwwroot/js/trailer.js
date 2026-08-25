import { createRng, randRange, randInt, pick } from "./rng.js";

export const WIDTH = 480;
export const HEIGHT = 270;

// Shared by the live preview (detail.js) and the page export (export.js) so
// both always derive the exact same seed for the exact same movie.
export function buildTrailerSeed(movieState, movie) {
  return `${movieState.seed}:${movieState.lang}:${movie.index}:${movie.title}`;
}

const LETTERBOX_HEIGHT = 20;
const CUT_FLASH_DURATION = 100;
const CUT_BLACK_DURATION = 150;

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
const CAMERA_STYLES = ["pushIn", "pullBack", "drift", "whip"];

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

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function easeInQuint(t) {
  return t * t * t * t * t;
}

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
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
  return text.split("").join("  ");
}

// Shrinks font size until `text` fits `maxWidth`, so long movie titles /
// taglines never spill off the 480px frame. Deterministic given the same text.
function fitFontSize(measureCtx, text, fontBuilder, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize) {
    measureCtx.font = fontBuilder(size);
    if (measureCtx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

// Picks `count` scene types from the 5 available, cycling through shuffled
// passes of the full set and never repeating the same type back-to-back.
function buildShotTypes(rng, count) {
  const types = [];
  while (types.length < count) {
    const shuffled = shuffle(rng, SCENE_TYPES);
    for (const t of shuffled) {
      if (types.length > 0 && t === types[types.length - 1]) continue;
      types.push(t);
      if (types.length === count) break;
    }
  }
  return types;
}

// ---------- scene builders (seeded content per scene type) ----------

function buildStarfield(rng) {
  const stars = Array.from({ length: randInt(rng, 90, 140) }, () => ({
    angle: randRange(rng, 0, Math.PI * 2),
    radius: randRange(rng, 4, WIDTH * 0.6),
    depth: randRange(rng, 0.25, 1),
    speed: randRange(rng, 40, 130),
    twinklePhase: randRange(rng, 0, Math.PI * 2),
  }));
  return { stars };
}

function buildNebula(rng) {
  // Fewer, larger, elongated fog banks drifting together (one direction) plus
  // a couple of light shafts -- reads as atmosphere, not scattered blobs.
  const driftAngle = randRange(rng, -0.3, 0.3);
  const wisps = Array.from({ length: randInt(rng, 4, 6) }, () => ({
    y: randRange(rng, HEIGHT * 0.15, HEIGHT * 0.85),
    depth: randRange(rng, 0.3, 1),
    widthScale: randRange(rng, 1.6, 2.6),
    heightScale: randRange(rng, 0.35, 0.6),
    radius: randRange(rng, 70, 130),
    xOffset: randRange(rng, 0, WIDTH),
    colorMix: rng(),
    pulseSpeed: randRange(rng, 0.15, 0.4),
  }));
  const shafts = Array.from({ length: randInt(rng, 2, 3) }, () => ({
    angle: randRange(rng, 0.5, 1.0) * (rng() > 0.5 ? 1 : -1),
    x: randRange(rng, WIDTH * 0.2, WIDTH * 0.8),
    width: randRange(rng, 30, 60),
    sweepSpeed: randRange(rng, 0.1, 0.25),
    phase: randRange(rng, 0, Math.PI * 2),
  }));
  return { wisps, shafts, driftAngle };
}

function buildStreaks(rng) {
  const makeLayer = (count, lenRange, speedRange, thickRange) => ({
    streaks: Array.from({ length: randInt(rng, count[0], count[1]) }, () => ({
      y: randRange(rng, 0, HEIGHT),
      length: randRange(rng, lenRange[0], lenRange[1]),
      speed: randRange(rng, speedRange[0], speedRange[1]),
      thickness: randRange(rng, thickRange[0], thickRange[1]),
      offset: randRange(rng, 0, WIDTH),
      colorMix: rng(),
    })),
  });
  // back layer: thin/slow/dim, front layer: thick/fast/bright -> parallax
  const layers = [
    { ...makeLayer([10, 16], [40, 110], [90, 180], [0.8, 2]), opacity: 0.4 },
    { ...makeLayer([6, 10], [90, 220], [260, 420], [1.5, 4]), opacity: 0.85 },
  ];
  return { layers, angle: randRange(rng, -0.35, 0.35) };
}

function buildShockwave(rng) {
  const pulses = Array.from({ length: randInt(rng, 4, 6) }, (_, i) => ({
    startDelay: randRange(rng, 0, 1.2) + i * 0.3,
    originX: randRange(rng, WIDTH * 0.35, WIDTH * 0.65),
    originY: randRange(rng, HEIGHT * 0.35, HEIGHT * 0.65),
  }));
  return {
    pulses,
    rayCount: randInt(rng, 12, 20),
    rotationSpeed: randRange(rng, -0.7, 0.7),
    coreX: randRange(rng, WIDTH * 0.4, WIDTH * 0.6),
    coreY: randRange(rng, HEIGHT * 0.4, HEIGHT * 0.6),
  };
}

function buildGeometry(rng) {
  const shapeCount = randInt(rng, 8, 13);
  const shapes = Array.from({ length: shapeCount }, () => ({
    sides: pick(rng, [3, 4, 6]),
    depth: randRange(rng, 0.3, 1),
    size: randRange(rng, 8, 30),
    targetX: randRange(rng, WIDTH * 0.2, WIDTH * 0.8),
    targetY: randRange(rng, HEIGHT * 0.2, HEIGHT * 0.8),
    startAngle: randRange(rng, 0, Math.PI * 2),
    spin: randRange(rng, -1.6, 1.6),
    burstAngle: randRange(rng, 0, Math.PI * 2),
    burstDistance: randRange(rng, 140, 300),
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

// A sparse layer of fast, bright dashes drawn in screen space (outside the
// scene's zoom/pan transform) on every scene type, so it visibly slides at a
// different speed than the zoomed background -- real foreground/background
// parallax rather than everything scaling together.
function buildForegroundDust(rng) {
  return Array.from({ length: randInt(rng, 10, 16) }, () => ({
    x: randRange(rng, 0, WIDTH),
    y: randRange(rng, 0, HEIGHT),
    len: randRange(rng, 14, 34),
    speed: randRange(rng, 170, 340),
    angle: randRange(rng, -0.3, 0.3) + Math.PI,
    thickness: randRange(rng, 1, 2.2),
  }));
}

function buildCamera(rng) {
  const style = pick(rng, CAMERA_STYLES);
  let zoomFrom;
  let zoomTo;
  if (style === "whip") {
    zoomFrom = randRange(rng, 1.0, 1.1);
    zoomTo = randRange(rng, 1.7, 2.1); // fast, deep punch-in right on the cut
  } else if (style === "pushIn") {
    zoomFrom = randRange(rng, 1.0, 1.15);
    zoomTo = randRange(rng, 1.45, 1.8);
  } else if (style === "pullBack") {
    zoomFrom = randRange(rng, 1.5, 1.85);
    zoomTo = randRange(rng, 1.0, 1.15); // reveal: starts tight, eases wide
  } else {
    zoomFrom = randRange(rng, 1.08, 1.25);
    zoomTo = randRange(rng, 1.3, 1.55);
  }
  return {
    style,
    zoomFrom,
    zoomTo,
    panFromX: randRange(rng, -34, 34),
    panFromY: randRange(rng, -22, 22),
    panToX: randRange(rng, -34, 34),
    panToY: randRange(rng, -22, 22),
    jitterSeed: randRange(rng, 0, Math.PI * 2),
  };
}

function cameraEase(style, t) {
  if (style === "pushIn") return easeOutQuint(t); // fast start, settles: punch-in
  if (style === "whip") return easeOutExpo(t); // near-instant snap, settles
  if (style === "pullBack") return easeInQuint(t); // slow start, accelerating reveal
  return easeInOutSine(t); // smooth continuous drift, never fully flat
}

function buildSceneInstance(rng, type) {
  return {
    type,
    camera: buildCamera(rng),
    gradientAngle: randRange(rng, 0, Math.PI * 2),
    foregroundDust: buildForegroundDust(rng),
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

  const shotCount = randInt(rng, 4, 6);
  const shotTypes = buildShotTypes(rng, shotCount);

  const totalDuration = randRange(rng, 5800, 9600);
  const studioCardDuration = randRange(rng, 700, 1000);
  const titleDarkHoldDuration = randRange(rng, 300, 450);
  const titleImpactDuration = randRange(rng, 450, 600);
  const titlePhaseDuration = randRange(rng, 2100, 2700);

  const sceneTotalDuration = Math.max(1800, totalDuration - studioCardDuration - titlePhaseDuration);

  // Beat schedule: starts around 1-1.5s per cut and accelerates toward the
  // title (each successive shot a bit shorter), then scaled to exactly fill
  // the scene budget -- the accelerating shape survives the scaling.
  const firstBeat = randRange(rng, 1000, 1500);
  const accel = randRange(rng, 0.8, 0.92);
  const minBeat = 420;
  const rawBeats = [];
  let beat = firstBeat;
  for (let i = 0; i < shotCount; i++) {
    rawBeats.push(Math.max(minBeat, beat));
    beat *= accel;
  }
  const rawSum = rawBeats.reduce((a, b) => a + b, 0);
  const beatScale = sceneTotalDuration / rawSum;

  const scenes = shotTypes.map((type, i) => {
    const shot = buildSceneInstance(rng, type);
    shot.durationMs = rawBeats[i] * beatScale;
    shot.cutStyle = pick(rng, ["flash", "black"]); // style of the cut INTO this shot
    return shot;
  });

  const sceneStarts = [];
  let cursor = 0;
  for (const scene of scenes) {
    sceneStarts.push(cursor);
    cursor += scene.durationMs;
  }

  const scenesStart = studioCardDuration;
  const titleRevealStart = scenesStart + cursor; // hard cut to black: the dark beat begins
  const titleImpactStart = titleRevealStart + titleDarkHoldDuration; // the punch
  const titleHoldStart = titleImpactStart + titleImpactDuration;
  const holdDuration = Math.max(500, titleRevealStart + titlePhaseDuration - titleHoldStart);
  const titleSweepDuration = Math.min(420, Math.max(150, holdDuration * 0.35));
  const titleSweepStart = titleHoldStart + holdDuration * randRange(rng, 0.25, 0.55);

  const cutTimes = [studioCardDuration];
  const cutStyles = [scenes[0].cutStyle];
  for (let i = 1; i < scenes.length; i++) {
    cutTimes.push(scenesStart + sceneStarts[i]);
    cutStyles.push(scenes[i].cutStyle);
  }
  cutTimes.push(titleRevealStart);
  cutStyles.push("black"); // deliberate hard cut to black before the title
  cutTimes.push(titleImpactStart);
  cutStyles.push("flash"); // bright punch as the title hits

  const hueRotate = randInt(rng, 0, 359);
  const saturate = randRange(rng, 1.1, 1.6);
  const brightness = randRange(rng, 0.92, 1.08);
  const contrast = randRange(rng, 1.15, 1.38);

  // Auto-fit title/tagline sizes so any movie title stays fully on-frame and readable.
  const scratchCtx = document.createElement("canvas").getContext("2d");
  const maxTextWidth = WIDTH * 0.86;
  const titleFontSize = fitFontSize(
    scratchCtx,
    title,
    (s) => `bold ${s}px Georgia, 'Times New Roman', serif`,
    maxTextWidth,
    34,
    16
  );
  const titleFont = `bold ${titleFontSize}px Georgia, 'Times New Roman', serif`;
  const trackedTagline = trackedText(tagline);
  const taglineFontSize = fitFontSize(
    scratchCtx,
    trackedTagline,
    (s) => `italic ${s}px Georgia, 'Times New Roman', serif`,
    maxTextWidth,
    15,
    9
  );
  const taglineFont = `italic ${taglineFontSize}px Georgia, 'Times New Roman', serif`;

  const audioRng = createRng(seedString + ":audio");

  return {
    title,
    tagline,
    trackedTagline,
    taglineFont,
    titleFont,
    palette,
    studioCardDuration,
    scenesStart,
    scenes,
    sceneStarts,
    titleRevealStart,
    titleDarkHoldDuration,
    titleImpactStart,
    titleImpactDuration,
    titleHoldStart,
    titleSweepStart,
    titleSweepDuration,
    totalDuration: titleRevealStart + titlePhaseDuration,
    cutTimes,
    cutStyles,
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

// Soft directional haze so every scene reads as one atmosphere rather than a
// flat pattern -- distant areas lighten slightly toward the palette's mid tone.
function drawAtmosphericFog(ctx, palette, tSeconds) {
  const drift = Math.sin(tSeconds * 0.15) * 40;
  const grad = ctx.createRadialGradient(WIDTH / 2 + drift, HEIGHT * 0.65, 20, WIDTH / 2, HEIGHT / 2, WIDTH * 0.9);
  grad.addColorStop(0, hexToRgba(palette.bg2, 0.25));
  grad.addColorStop(1, hexToRgba(palette.bg2, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawStarfield(ctx, scene, palette, tSeconds) {
  // Radiating streaks from center, accelerating with depth -> hyperspace dolly,
  // with each star drawn as a short trail rather than a static dot.
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  for (const s of scene.stars) {
    const r = wrap(s.radius + s.speed * s.depth * tSeconds * 22, WIDTH * 0.62) + 4;
    const prevR = Math.max(4, r - s.speed * s.depth * 1.1);
    const x = cx + Math.cos(s.angle) * r;
    const y = cy + Math.sin(s.angle) * r * 0.66;
    const px = cx + Math.cos(s.angle) * prevR;
    const py = cy + Math.sin(s.angle) * prevR * 0.66;
    const brightness = 0.25 + s.depth * 0.75;
    const twinkle = 0.6 + 0.4 * Math.sin(tSeconds * 3 + s.twinklePhase);
    ctx.strokeStyle = s.depth > 0.6 ? "#ffffff" : palette.accent;
    ctx.globalAlpha = brightness * twinkle;
    ctx.lineWidth = 0.6 + s.depth * 1.8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx, scene, palette, tSeconds) {
  const dx = Math.cos(scene.driftAngle);
  const dy = Math.sin(scene.driftAngle) * 0.3;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const w of scene.wisps) {
    const speed = 6 + w.depth * 14;
    const x = wrap(w.xOffset + dx * speed * tSeconds, WIDTH + w.radius * 2) - w.radius;
    const y = w.y + dy * speed * tSeconds;
    const pulse = 1 + Math.sin(tSeconds * w.pulseSpeed + w.xOffset) * 0.12;
    const color = w.colorMix > 0.5 ? palette.accent : palette.accent2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(w.widthScale * pulse, w.heightScale * pulse);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w.radius);
    grad.addColorStop(0, hexToRgba(color, 0.22 * (0.4 + w.depth * 0.6)));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, w.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // light shafts sweeping through the fog bank
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const s of scene.shafts) {
    const sweep = Math.sin(tSeconds * s.sweepSpeed + s.phase) * WIDTH * 0.3;
    ctx.save();
    ctx.translate(s.x + sweep, HEIGHT / 2);
    ctx.rotate(s.angle);
    const grad = ctx.createLinearGradient(-s.width, 0, s.width, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, hexToRgba(palette.accent, 0.16));
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(-s.width, -HEIGHT, s.width * 2, HEIGHT * 2);
    ctx.restore();
  }
  ctx.restore();
}

function drawStreaks(ctx, scene, palette, tSeconds) {
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(scene.angle);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);
  for (const layerData of scene.layers) {
    for (const s of layerData.streaks) {
      const headX = wrap(s.offset + tSeconds * s.speed, WIDTH + s.length) - s.length / 2;
      const color = s.colorMix > 0.5 ? palette.accent : palette.accent2;
      // trailing echo copies behind the head -> explicit motion blur
      for (let e = 0; e < 3; e++) {
        const echoX = headX - e * s.length * 0.35;
        const echoAlpha = layerData.opacity * (1 - e * 0.32);
        if (echoAlpha <= 0) continue;
        const grad = ctx.createLinearGradient(echoX - s.length, s.y, echoX, s.y);
        grad.addColorStop(0, hexToRgba(color, 0));
        grad.addColorStop(1, hexToRgba(color, echoAlpha));
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.thickness * (1 - e * 0.25);
        ctx.beginPath();
        ctx.moveTo(echoX - s.length, s.y);
        ctx.lineTo(echoX, s.y);
        ctx.stroke();
      }
    }
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
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * WIDTH, Math.sin(angle) * WIDTH);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // pulsing energy core at the epicenter
  const corePulse = 0.6 + 0.4 * Math.sin(tSeconds * 2.4);
  const coreRadius = 46 * corePulse + 20;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const coreGrad = ctx.createRadialGradient(scene.coreX, scene.coreY, 0, scene.coreX, scene.coreY, coreRadius);
  coreGrad.addColorStop(0, hexToRgba(palette.accent, 0.55));
  coreGrad.addColorStop(1, hexToRgba(palette.accent, 0));
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(scene.coreX, scene.coreY, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // expanding rings, each with a trailing echo behind its leading edge
  for (const p of scene.pulses) {
    const life = tSeconds - p.startDelay;
    if (life < 0) continue;
    const cycle = 1.6;
    const t = (life % cycle) / cycle;
    for (let e = 0; e < 2; e++) {
      const et = clamp01(t - e * 0.06);
      if (et <= 0) continue;
      const radius = et * WIDTH * 0.75;
      const alpha = (1 - et) * 0.55 * (1 - e * 0.5);
      if (alpha <= 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3 - e;
      ctx.arc(p.originX, p.originY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    const sizeScale = 0.6 + shape.depth * 0.8;
    const startX = shape.targetX + Math.cos(shape.burstAngle) * 220 * shape.depth;
    const startY = shape.targetY + Math.sin(shape.burstAngle) * 220 * shape.depth;
    let x = lerp(startX, shape.targetX, buildEase);
    let y = lerp(startY, shape.targetY, buildEase);
    let trailDist = 0;
    if (breakEase > 0) {
      trailDist = shape.burstDistance * shape.depth * breakEase;
      x = shape.targetX + Math.cos(shape.burstAngle) * trailDist;
      y = shape.targetY + Math.sin(shape.burstAngle) * trailDist;
    }
    const alpha = (breakEase > 0 ? Math.max(0, 1 - breakEase) : buildEase) * (0.5 + shape.depth * 0.5);
    if (alpha <= 0) continue;
    const rotation = shape.startAngle + tSeconds * shape.spin;
    const color = shape.colorMix > 0.5 ? palette.accent : palette.accent2;

    // comet trail behind fast-breaking shapes
    if (breakEase > 0.05) {
      for (let e = 1; e <= 2; e++) {
        const echoDist = trailDist - e * 14 * shape.depth;
        if (echoDist <= 0) continue;
        const ex = shape.targetX + Math.cos(shape.burstAngle) * echoDist;
        const ey = shape.targetY + Math.sin(shape.burstAngle) * echoDist;
        ctx.globalAlpha = alpha * (1 - e * 0.4);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        drawPolygonPath(ctx, ex, ey, shape.size * sizeScale, shape.sides, rotation);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    drawPolygonPath(ctx, x, y, shape.size * sizeScale, shape.sides, rotation);
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

// Fast bright dashes drawn in plain screen space -- NOT inside the camera's
// zoom/pan transform below -- so they visibly slide at their own speed while
// the background zooms/pans underneath: real two-layer parallax.
function drawForegroundParallax(ctx, scene, palette, tSeconds) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of scene.foregroundDust) {
    const dx = Math.cos(d.angle);
    const dy = Math.sin(d.angle);
    const headX = wrap(d.x + dx * d.speed * tSeconds, WIDTH + d.len);
    const headY = wrap(d.y + dy * d.speed * tSeconds * 0.4, HEIGHT + d.len);
    const grad = ctx.createLinearGradient(headX - dx * d.len, headY - dy * d.len, headX, headY);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,0.55)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = d.thickness;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(headX - dx * d.len, headY - dy * d.len);
    ctx.lineTo(headX, headY);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawScene(ctx, scene, palette, localMs) {
  const tSeconds = localMs / 1000;
  const progress = clamp01(localMs / scene.durationMs);
  const eased = cameraEase(scene.camera.style, progress);
  const zoom = lerp(scene.camera.zoomFrom, scene.camera.zoomTo, eased);
  // tiny perpetual handheld jitter on top of the eased pan -> the frame is
  // never perfectly still, even at the start/end of an eased curve.
  const jitterX =
    Math.sin(tSeconds * 5.3 + scene.camera.jitterSeed) * 1.4 + Math.sin(tSeconds * 11.7 + scene.camera.jitterSeed) * 0.6;
  const jitterY =
    Math.cos(tSeconds * 4.7 + scene.camera.jitterSeed) * 1.1 + Math.cos(tSeconds * 9.1 + scene.camera.jitterSeed) * 0.5;
  const panX = lerp(scene.camera.panFromX, scene.camera.panToX, eased) + jitterX;
  const panY = lerp(scene.camera.panFromY, scene.camera.panToY, eased) + jitterY;

  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-WIDTH / 2 + panX, -HEIGHT / 2 + panY);
  drawBackgroundGradient(ctx, palette, scene.gradientAngle);
  drawAtmosphericFog(ctx, palette, tSeconds);
  SCENE_DRAWERS[scene.type](ctx, scene, palette, tSeconds, eased);
  ctx.restore();

  drawForegroundParallax(ctx, scene, palette, tSeconds);
}

function findSceneIndexAt(plan, localT) {
  for (let i = 0; i < plan.scenes.length; i++) {
    const end = plan.sceneStarts[i] + plan.scenes[i].durationMs;
    if (localT < end) return i;
  }
  return plan.scenes.length - 1;
}

// ---------- grading / texture ----------

// One strong, palette-derived grade applied identically in every phase, so
// the whole trailer reads as a single unified look rather than per-scene tints.
function applyGradeOverlay(ctx, palette) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.24;
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
  gradient.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawFilmGrain(ctx, plan, tSeconds) {
  const tile = plan.grainTile;
  const pattern = ctx.createPattern(tile, "repeat");
  const offsetX = Math.sin(tSeconds * 13.1) * tile.width;
  const offsetY = Math.cos(tSeconds * 9.7) * tile.height;
  ctx.save();
  ctx.globalAlpha = 0.05;
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

function nearestCutIndex(plan, tMs) {
  let bestIdx = -1;
  let bestDiff = null;
  for (let i = 0; i < plan.cutTimes.length; i++) {
    const diff = tMs - plan.cutTimes[i];
    if (diff >= 0 && (bestDiff === null || diff < bestDiff)) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx === -1 ? null : { index: bestIdx, offset: bestDiff };
}

// Deliberate hard cuts: alternates a bright flash punch with a true hard-black
// frame (seeded per cut), rather than a single soft dissolve every time.
function drawCutFlash(ctx, plan, tMs) {
  const hit = nearestCutIndex(plan, tMs);
  if (!hit) return;
  const style = plan.cutStyles[hit.index];
  const duration = style === "black" ? CUT_BLACK_DURATION : CUT_FLASH_DURATION;
  if (hit.offset > duration) return;
  const remaining = 1 - hit.offset / duration;
  ctx.save();
  if (style === "black") {
    ctx.globalAlpha = clamp01(remaining * 1.6);
    ctx.fillStyle = "#000000";
  } else {
    ctx.globalAlpha = remaining * 0.6;
    ctx.fillStyle = "#ffffff";
  }
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
  octx.font = plan.titleFont;
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
  ctx.font = plan.titleFont;

  const clampedImpact = clamp01(impactT);
  const scale = lerp(0.3, 1, easeOutBack(clampedImpact)); // big entrance range -> a real punch, settles at 1
  const alpha = clamp01(impactT / 0.55);
  const shakeAmp = clampedImpact < 1 ? (1 - clampedImpact) * 5 : 0;
  const dx = shakeAmp ? Math.sin(tSeconds * 47) * shakeAmp : 0;
  const dy = shakeAmp ? Math.cos(tSeconds * 53) * shakeAmp * 0.6 : 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(WIDTH / 2 + dx, HEIGHT / 2 + dy);
  ctx.scale(scale, scale);

  // soft colored bloom pass behind the text, then a crisp white pass on top
  ctx.shadowColor = plan.palette.accent;
  ctx.shadowBlur = 26 + Math.sin(tSeconds * 2) * 4;
  ctx.fillStyle = hexToRgba(plan.palette.accent, 0.55);
  ctx.fillText(plan.title, 0, 0);

  ctx.shadowBlur = 12 + Math.sin(tSeconds * 2) * 3;
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
  ctx.font = plan.taglineFont;
  ctx.shadowColor = plan.palette.accent;
  ctx.shadowBlur = 8;
  ctx.fillText(plan.trackedTagline, WIDTH / 2, HEIGHT / 2);
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

  // ---- climax: hard cut to black -> dark beat (+ tagline echo) -> title punch -> steady hold ----
  const lastScene = plan.scenes[plan.scenes.length - 1];
  const driftMs = lastScene.durationMs + (tMs - plan.titleRevealStart) * 0.15;
  ctx.filter = plan.filter;
  drawScene(ctx, lastScene, plan.palette, driftMs);
  ctx.filter = "none";
  applyGradeOverlay(ctx, plan.palette);

  const darkT = clamp01((tMs - plan.titleRevealStart) / plan.titleDarkHoldDuration);
  const afterImpact = tMs >= plan.titleImpactStart;
  const darkness = afterImpact ? 0.55 : lerp(0.45, 0.88, darkT);
  ctx.fillStyle = `rgba(0, 0, 0, ${darkness.toFixed(2)})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawVignette(ctx);
  drawFilmGrain(ctx, plan, tMs / 1000);
  drawCutFlash(ctx, plan, tMs);
  drawLetterbox(ctx);

  if (!afterImpact) {
    // a short tagline echo rises and fades during the dark beat, right before the title hits
    const taglineAlpha = Math.sin(darkT * Math.PI) * 0.85;
    if (taglineAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = taglineAlpha;
      ctx.fillStyle = plan.palette.accent;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = plan.taglineFont;
      ctx.shadowColor = plan.palette.accent;
      ctx.shadowBlur = 8;
      ctx.fillText(plan.trackedTagline, WIDTH / 2, HEIGHT / 2);
      ctx.restore();
    }
    return;
  }

  const impactT = (tMs - plan.titleImpactStart) / plan.titleImpactDuration;
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
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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

    // one hit per visual cut, styled to match: a lower thud for hard-black
    // cuts, a brighter tick for flash cuts -- audio stays locked to the edit.
    for (let i = 0; i < plan.cutTimes.length; i++) {
      const cutMs = plan.cutTimes[i];
      const style = plan.cutStyles[i];
      const t = now + cutMs / 1000;
      const isBlack = style === "black";
      const osc = ctx.createOscillator();
      osc.type = isBlack ? "sine" : "triangle";
      const startFreq = plan.audio.droneFreq * (isBlack ? 1.5 : 4);
      const endFreq = Math.max(20, startFreq * (isBlack ? 0.5 : 0.3));
      const dur = isBlack ? 0.26 : 0.18;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isBlack ? 0.2 : 0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
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
