/**
 * bodyGarmentEngine.js
 * ---------------------------------------------------------------------------
 * Pure measurement → SVG-outline math. No React, no DOM, no images.
 *
 * This is the piece meant to be dropped into an existing project: feed it
 * a body's measurements and a garment's measurements (plus its category),
 * get back SVG path strings and reference points you can render however
 * you like (the companion BodyGarmentComparator.jsx is one example renderer).
 *
 * Design rules baked in throughout:
 *  - Every width comes from a real measurement. Nothing is guessed.
 *  - If a measurement needed to place a point isn't provided, that point
 *    is simply left out — the outline draws a straight line between the
 *    nearest two points that ARE known, instead of inventing a curve.
 *  - Circumference-style measurements (chest/waist/hip) are converted to a
 *    front-view flat width via CIRC_TO_WIDTH. This is a stylised
 *    approximation for visual size comparison, not a tailoring spec.
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Canvas constants — shared by every outline so body + garments line up.
// ---------------------------------------------------------------------------
export const VB_W = 440;
export const VB_H = 620;
export const TOP_MARGIN = 34;
export const DRAW_H = 540; // the body's `height` measurement maps onto this
export const CENTER_X = VB_W / 2;

// Vertical layout, expressed as a fraction of DRAW_H (0 = top of figure).
export const LEVELS = {
  neck: 0.135,
  shoulder: 0.175,
  chest: 0.27,
  waist: 0.44,
  hip: 0.505,
  thigh: 0.58,
  crotch: 0.535,
  knee: 0.75,
  foot: 1.0,
};

// Front-view width ≈ circumference * CIRC_TO_WIDTH (torso isn't a cylinder;
// only part of the circumference is visible from the front).
export const CIRC_TO_WIDTH = 0.34;

/** True only for finite numbers — the single source of truth for "was this
 *  measurement actually given?" used everywhere below. */
export const has = (v) => typeof v === "number" && Number.isFinite(v);

// ---------------------------------------------------------------------------
// Generic path helpers
// ---------------------------------------------------------------------------

/** Rounds every vertex of a point list into a smooth curve via quadratic
 *  corner-cutting. Lower radius = crisper/more tailored, higher = softer. */
export function smoothPath(points, radius = 0.14, closed = true) {
  const n = points.length;
  if (n < 2) return "";
  const at = (i) => points[(i + n) % n];
  const cmds = [];
  for (let i = 0; i < n; i++) {
    const curr = at(i);
    if (!closed && (i === 0 || i === n - 1)) {
      cmds.push(`${i === 0 ? "M" : "L"} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`);
      continue;
    }
    const prev = at(i - 1);
    const next = at(i + 1);
    const p1 = { x: curr.x + (prev.x - curr.x) * radius, y: curr.y + (prev.y - curr.y) * radius };
    const p2 = { x: curr.x + (next.x - curr.x) * radius, y: curr.y + (next.y - curr.y) * radius };
    cmds.push(i === 0 ? `M ${p1.x.toFixed(2)},${p1.y.toFixed(2)}` : `L ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`);
    cmds.push(`Q ${curr.x.toFixed(2)},${curr.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
  }
  if (closed) cmds.push("Z");
  return cmds.join(" ");
}

/** Mirrors a right-half point list across x=0 and stitches both halves
 *  together through one shared bottom-center point. `rightPoints` should
 *  already have any "unavailable measurement" entries filtered out. */
export function closeSymmetric(rightPoints, bottomCenter) {
  const mirrored = rightPoints
    .slice(1)
    .reverse()
    .map((p) => ({ x: -p.x, y: p.y }));
  return [...rightPoints, bottomCenter, ...mirrored];
}

// ---------------------------------------------------------------------------
// Scale
// ---------------------------------------------------------------------------

/** Everything — body and every garment — is placed using ONE scale so
 *  outlines share the same center and proportions, per spec. */
export function makeBodyScale(heightCm) {
  const safeHeight = has(heightCm) && heightCm > 0 ? heightCm : 170;
  const pxPerCm = DRAW_H / safeHeight;
  return { pxPerCm, heightCm: safeHeight, y: (frac) => TOP_MARGIN + frac * DRAW_H };
}

// ---------------------------------------------------------------------------
// Body outline
// ---------------------------------------------------------------------------

/** Builds a symmetric body silhouette (torso + legs) centered on x=0.
 *  Translate the returned path by CENTER_X (or wrap in a <g>) to place it
 *  on an actual canvas — the geometry itself stays origin-centered so it
 *  composes cleanly with zoom/pan transforms. */
export function buildBodyOutline(body, bodyScale) {
  const scale = bodyScale || makeBodyScale(body?.height);
  const { pxPerCm, y } = scale;

  const shoulderHalf = has(body?.shoulder) ? (body.shoulder / 2) * pxPerCm : DRAW_H * 0.09;
  const chestHalf = has(body?.chest) ? ((body.chest * CIRC_TO_WIDTH) / 2) * pxPerCm : shoulderHalf * 0.78;
  const waistHalf = has(body?.waist) ? ((body.waist * CIRC_TO_WIDTH) / 2) * pxPerCm : chestHalf * 0.86;
  const hipHalf = has(body?.hip) ? ((body.hip * CIRC_TO_WIDTH) / 2) * pxPerCm : chestHalf * 0.95;

  const levels = {
    shoulder: y(LEVELS.shoulder),
    chest: y(LEVELS.chest),
    waist: y(LEVELS.waist),
    hip: y(LEVELS.hip),
  };

  const right = [
    { x: 0, y: y(LEVELS.neck) },
    { x: shoulderHalf * 0.45, y: y(0.15) },
    { x: shoulderHalf, y: levels.shoulder },
    { x: chestHalf, y: levels.chest },
    { x: waistHalf, y: levels.waist },
    { x: hipHalf, y: levels.hip },
    { x: hipHalf * 0.68, y: y(0.53) },
    { x: hipHalf * 0.4, y: y(LEVELS.knee) },
    { x: hipHalf * 0.32, y: y(0.98) },
    { x: hipHalf * 0.32, y: y(LEVELS.foot) },
    { x: hipHalf * 0.09, y: y(LEVELS.foot) },
    { x: hipHalf * 0.13, y: y(LEVELS.knee) },
    { x: hipHalf * 0.09, y: y(0.535) },
  ];
  const points = closeSymmetric(right, { x: 0, y: y(0.515) });

  const headR = DRAW_H * 0.055;
  const head = { cx: 0, cy: y(LEVELS.neck) - headR * 0.92, r: headR };

  return { path: smoothPath(points, 0.16), head, levels, pxPerCm, y };
}

// ---------------------------------------------------------------------------
// Garment classification
// ---------------------------------------------------------------------------

export const CATEGORY_CLASS = {
  tshirt: "top", tee: "top", "t-shirt": "top", shirt: "top", blazer: "top",
  hoodie: "top", jacket: "top", sweatshirt: "top", sweater: "top", kurta: "top", coat: "top",
  jeans: "bottom", trousers: "bottom", pants: "bottom", shorts: "bottom",
  joggers: "bottom", chinos: "bottom", leggings: "bottom", skirt: "bottom",
  dress: "dress", gown: "dress", maxidress: "dress", "a-line-dress": "dress",
};

/** category string -> 'top' | 'bottom' | 'dress'. Defaults to 'top' for an
 *  unrecognised category so the engine never throws on unknown input. */
export function resolveGarmentClass(category) {
  return CATEGORY_CLASS[String(category || "").toLowerCase()] || "top";
}

/** Fields the visualiser needs at minimum to draw each garment class.
 *  Anything else (sleeve, waist, hip, legOpening, thigh…) is optional —
 *  missing optional fields just mean one less vertex, i.e. a straight
 *  line where a curve would otherwise be. */
export const REQUIRED_FIELDS = {
  top: ["shoulder", "chest", "length"],
  dress: ["shoulder", "chest", "length"],
  bottom: ["waist", "length"],
};

// Neckline styling per category — this is what gives a blazer a deeper
// open collar vs. a hoodie's wide crew neck, without needing separate
// geometry functions for every garment type.
const NECK_STYLE = {
  tshirt: { drop: 7, widthRatio: 0.32, sleeveTaper: 1 },
  shirt: { drop: 6, widthRatio: 0.3, sleeveTaper: 0.95 },
  blazer: { drop: 12, widthRatio: 0.34, sleeveTaper: 0.9 },
  hoodie: { drop: 9, widthRatio: 0.42, sleeveTaper: 1.1 },
  jacket: { drop: 10, widthRatio: 0.34, sleeveTaper: 0.95 },
  sweatshirt: { drop: 8, widthRatio: 0.38, sleeveTaper: 1.05 },
  sweater: { drop: 7, widthRatio: 0.34, sleeveTaper: 1 },
  kurta: { drop: 7, widthRatio: 0.28, sleeveTaper: 1 },
  coat: { drop: 10, widthRatio: 0.34, sleeveTaper: 1 },
  dress: { drop: 8, widthRatio: 0.3, sleeveTaper: 1 },
  gown: { drop: 9, widthRatio: 0.28, sleeveTaper: 1 },
  maxidress: { drop: 8, widthRatio: 0.3, sleeveTaper: 1 },
};
const DEFAULT_NECK_STYLE = NECK_STYLE.tshirt;

// ---------------------------------------------------------------------------
// Garment outlines
// ---------------------------------------------------------------------------

/**
 * Shared builder for anything worn on top — t-shirt, shirt, blazer,
 * hoodie, jacket, kurta — AND dresses (a dress is simply an upper-body
 * garment that keeps going past the waist/hip to a longer hem). Waist and
 * hip shaping are drawn ONLY when those measurements are supplied, so
 * curvature only ever appears when the data actually supports it.
 */
export function buildUpperGarmentOutline(measurements, bodyScale, category = "tshirt") {
  const cls = resolveGarmentClass(category);
  const required = cls === "dress" ? REQUIRED_FIELDS.dress : REQUIRED_FIELDS.top;
  const missing = required.filter((k) => !has(measurements?.[k]));
  const shoulderLineY = bodyScale.y(LEVELS.shoulder);
  if (missing.length) return { path: null, hemY: null, shoulderLineY, missing, category };

  const { pxPerCm, y } = bodyScale;
  const style = NECK_STYLE[category] || (cls === "dress" ? NECK_STYLE.dress : DEFAULT_NECK_STYLE);

  const shoulderHalf = (measurements.shoulder / 2) * pxPerCm;
  const chestHalf = ((measurements.chest * CIRC_TO_WIDTH) / 2) * pxPerCm;
  const neckHalf = shoulderHalf * style.widthRatio;
  const neckDropPx = style.drop * pxPerCm;
  const armholeDropPx = 9 * pxPerCm;

  const hasSleeve = has(measurements.sleeve);
  const sleeveLen = hasSleeve ? measurements.sleeve * pxPerCm : 0;

  const hemY = shoulderLineY + measurements.length * pxPerCm;
  const waistY = y(LEVELS.waist);
  const hipY = y(LEVELS.hip);
  const waistHalf = has(measurements.waist) ? ((measurements.waist * CIRC_TO_WIDTH) / 2) * pxPerCm : null;
  const hipHalf = has(measurements.hip) ? ((measurements.hip * CIRC_TO_WIDTH) / 2) * pxPerCm : null;
  const underarmY = shoulderLineY + armholeDropPx;

  const rightRaw = [
    { x: 0, y: shoulderLineY + neckDropPx },
    { x: neckHalf, y: shoulderLineY },
    { x: shoulderHalf, y: shoulderLineY },
    hasSleeve ? { x: shoulderHalf + sleeveLen * 0.9 * style.sleeveTaper, y: shoulderLineY + sleeveLen * 0.32 } : null,
    hasSleeve ? { x: shoulderHalf + sleeveLen * 0.66 * style.sleeveTaper, y: shoulderLineY + sleeveLen * 0.58 } : null,
    { x: chestHalf * 1.04, y: underarmY },
    waistHalf != null && waistY > underarmY && waistY < hemY ? { x: waistHalf, y: waistY } : null,
    hipHalf != null && hipY > underarmY && hipY < hemY ? { x: hipHalf, y: hipY } : null,
    { x: cls === "dress" && hipHalf != null ? hipHalf * 1.03 : chestHalf, y: hemY },
  ].filter(Boolean);

  const points = closeSymmetric(rightRaw, { x: 0, y: hemY });
  return { path: smoothPath(points, 0.11), hemY, shoulderLineY, missing: [], category };
}

/**
 * Builder for anything worn on the legs — jeans, trousers, shorts,
 * joggers, skirts. Waistband sits on the body's own waist line so it
 * shares scale/center with everything else. Hip, thigh and leg-opening
 * are all optional: each missing one removes a vertex, leaving a
 * straight run between the points that ARE known.
 */
export function buildBottomOutline(measurements, bodyScale, category = "jeans") {
  const missing = REQUIRED_FIELDS.bottom.filter((k) => !has(measurements?.[k]));
  const waistY = bodyScale.y(LEVELS.waist);
  if (missing.length) return { path: null, hemY: null, waistY, missing, category };

  const { pxPerCm, y } = bodyScale;
  const waistHalf = ((measurements.waist * CIRC_TO_WIDTH) / 2) * pxPerCm;
  const hipHalf = has(measurements.hip) ? ((measurements.hip * CIRC_TO_WIDTH) / 2) * pxPerCm : null;
  const thighHalf = has(measurements.thigh) ? ((measurements.thigh * CIRC_TO_WIDTH) / 2) * pxPerCm : null;
  const hipY = y(LEVELS.hip);
  const thighY = y(LEVELS.thigh);
  const hemY = waistY + measurements.length * pxPerCm;

  // Outer leg line: use the last known width and, if leg opening isn't
  // given, keep running that same width straight down to the hem.
  const lastKnownOuter = thighHalf ?? hipHalf ?? waistHalf;
  const legOpeningHalf = has(measurements.legOpening) ? (measurements.legOpening / 2) * pxPerCm : lastKnownOuter;
  const innerBase = waistHalf * 0.16; // structural inseam gap — not a garment measurement

  const rightRaw = [
    { x: 0, y: waistY },
    { x: waistHalf, y: waistY },
    hipHalf != null && hipY < hemY ? { x: hipHalf, y: hipY } : null,
    thighHalf != null && thighY < hemY ? { x: thighHalf, y: thighY } : null,
    { x: legOpeningHalf, y: hemY },
    { x: Math.min(legOpeningHalf, innerBase * 1.4), y: hemY },
    thighHalf != null && thighY < hemY ? { x: innerBase * 1.2, y: thighY } : null,
    { x: innerBase, y: y(LEVELS.crotch) },
  ].filter(Boolean);

  const points = closeSymmetric(rightRaw, { x: 0, y: y(LEVELS.crotch) });
  return { path: smoothPath(points, 0.09), hemY, waistY, missing: [], category };
}

/** Single entry point: pass any category, get the right outline back. */
export function buildGarmentOutline(measurements, bodyScale, category) {
  const cls = resolveGarmentClass(category ?? measurements?.category);
  if (cls === "bottom") return buildBottomOutline(measurements, bodyScale, category ?? measurements?.category);
  return buildUpperGarmentOutline(measurements, bodyScale, category ?? measurements?.category);
}

// ---------------------------------------------------------------------------
// Comparison / ease
// ---------------------------------------------------------------------------

/** Comfort classification for chest/shoulder/waist/hip ease
 *  (garment measurement − body measurement, in cm). */
export function classifyEase(ease) {
  if (ease < 2) return { label: "Tight", fg: "#9A1F1F", bg: "#F6DEDE" };
  if (ease < 6) return { label: "Regular", fg: "#8A6112", bg: "#F6EAC8" };
  return { label: "Comfortable", fg: "#1F6B3A", bg: "#DCEBDF" };
}

// Which measurement rows make sense for each garment class, in display order.
export const METRIC_DEFS = {
  top: [
    { key: "shoulder", label: "Shoulder", comparableToBody: true },
    { key: "chest", label: "Chest", comparableToBody: true },
    { key: "length", label: "Length", comparableToBody: false },
    { key: "sleeve", label: "Sleeve", comparableToBody: false },
  ],
  dress: [
    { key: "shoulder", label: "Shoulder", comparableToBody: true },
    { key: "chest", label: "Chest", comparableToBody: true },
    { key: "waist", label: "Waist", comparableToBody: true },
    { key: "hip", label: "Hip", comparableToBody: true },
    { key: "length", label: "Length", comparableToBody: false },
  ],
  bottom: [
    { key: "waist", label: "Waist", comparableToBody: true },
    { key: "hip", label: "Hip", comparableToBody: true },
    { key: "length", label: "Length", comparableToBody: false },
    { key: "legOpening", label: "Leg Opening", comparableToBody: false },
  ],
};

/** Builds one row per relevant metric. Any value not present in the
 *  source object comes through as `null` — the renderer's job is to draw
 *  that as a dash / straight line rather than fabricate a number. */
export function buildComparisonRows(bodyMeasurements, previousGarment, currentGarment, garmentClass) {
  const metrics = METRIC_DEFS[garmentClass] || METRIC_DEFS.top;
  return metrics.map(({ key, label, comparableToBody }) => ({
    key,
    label,
    comparableToBody,
    bodyVal: has(bodyMeasurements?.[key]) ? bodyMeasurements[key] : null,
    prevVal: has(previousGarment?.[key]) ? previousGarment[key] : null,
    currVal: has(currentGarment?.[key]) ? currentGarment[key] : null,
  }));
}

// ---------------------------------------------------------------------------
// Convenience wrapper — the one function most integrations will call
// ---------------------------------------------------------------------------

/**
 * generateOutlines({ body, previousGarment, currentGarment })
 * Body: { height, shoulder, chest, waist, hip }
 * Garment: { category, shoulder?, chest?, waist?, hip?, sleeve?, length?,
 *            legOpening?, thigh?, label?, brand? }
 *
 * Returns everything a renderer needs: the shared scale, the body outline,
 * both garment outlines, their resolved classes, and ready-to-render
 * comparison table rows.
 */
export function generateOutlines({ body, previousGarment, currentGarment }) {
  const bodyScale = makeBodyScale(body?.height);
  const bodyOutline = buildBodyOutline(body, bodyScale);

  const prevClass = resolveGarmentClass(previousGarment?.category);
  const currClass = resolveGarmentClass(currentGarment?.category);

  const prevOutline = buildGarmentOutline(previousGarment, bodyScale, previousGarment?.category);
  const currOutline = buildGarmentOutline(currentGarment, bodyScale, currentGarment?.category);

  const rows = buildComparisonRows(body, previousGarment, currentGarment, currClass);

  return { bodyScale, bodyOutline, prevOutline, currOutline, prevClass, currClass, rows };
}
