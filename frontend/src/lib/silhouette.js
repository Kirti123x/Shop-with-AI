// Turns 6 measurement numbers into a stylized SVG body outline - no photo,
// no ML, no stored mask. Both the user's body silhouette and a garment's
// silhouette are drawn with this SAME function, just fed different numbers,
// so they always share one coordinate system and can be overlaid directly.

export const VIEW_WIDTH = 220
export const VIEW_HEIGHT = 420

// Fraction of total height (from the top of the head) where each landmark
// sits. Stylized average proportions - a visual aid, not medical data.
const Y_RATIO = {
  head_top: 0.0,
  neck: 0.11,
  shoulder: 0.15,
  chest: 0.26,
  waist: 0.42,
  hip: 0.49,
  ankle: 1.0,
}

// chest_cm / waist_cm / hip_cm coming out of the measurement pipeline are
// CIRCUMFERENCES. For a front-view silhouette we need a WIDTH, so we
// approximate the body cross-section as an ellipse and back out the front
// width. This is an approximation for visualization, not a precise figure.
function circumferenceToWidth(circumferenceCm) {
  if (!circumferenceCm) return 0
  return (circumferenceCm / Math.PI) * 1.05
}

function scaleFor(heightCm) {
  return VIEW_HEIGHT / heightCm
}

/**
 * Builds control points (y in cm-from-top, halfWidth in cm) for a full body
 * outline: head -> neck -> shoulder -> chest -> waist -> hip -> ankle.
 */
function bodyControlPoints(m) {
  const h = m.height_cm
  const shoulderHalf = (m.shoulder_cm || h * 0.235) / 2
  const chestHalf = circumferenceToWidth(m.chest_cm) / 2 || shoulderHalf * 0.95
  const waistHalf = circumferenceToWidth(m.waist_cm) / 2 || shoulderHalf * 0.8
  const hipHalf = circumferenceToWidth(m.hip_cm) / 2 || shoulderHalf * 0.95
  const crotchY = m.inseam_cm ? h - m.inseam_cm : h * Y_RATIO.hip + h * 0.02
  const ankleHalf = hipHalf * 0.18
  const neckHalf = shoulderHalf * 0.32
  const headRadius = h * 0.055

  return {
    headRadius,
    points: [
      { y: h * Y_RATIO.neck, half: neckHalf },
      { y: h * Y_RATIO.shoulder, half: shoulderHalf },
      { y: h * Y_RATIO.chest, half: chestHalf },
      { y: h * Y_RATIO.waist, half: waistHalf },
      { y: h * Y_RATIO.hip, half: hipHalf },
      { y: crotchY, half: hipHalf * 0.45 }, // inner leg gap starts
      { y: crotchY + (h - crotchY) * 0.5, half: ankleHalf * 1.4 }, // knee-ish
      { y: h * Y_RATIO.ankle, half: ankleHalf },
    ],
    headY: h * Y_RATIO.head_top + h * 0.05,
  }
}

/** Full body silhouette (head + torso + legs), used for the user's own outline. */
export function buildBodySilhouette(measurements) {
  if (!measurements?.height_cm) return null
  const scale = scaleFor(measurements.height_cm)
  const cx = VIEW_WIDTH / 2
  const { points, headRadius, headY } = bodyControlPoints(measurements)

  const toSvgY = (cmY) => cmY * scale
  const toSvgX = (halfCm) => halfCm * scale

  const left = points.map((p) => [cx - toSvgX(p.half), toSvgY(p.y)])
  const right = points.map((p) => [cx + toSvgX(p.half), toSvgY(p.y)]).reverse()

  const torsoPath =
    'M ' + left.map((p) => p.join(',')).join(' L ') + ' L ' + right.map((p) => p.join(',')).join(' L ') + ' Z'

  const headCircle = { cx, cy: toSvgY(headY), r: headRadius * scale }

  return { torsoPath, headCircle, viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}` }
}

/**
 * Garment silhouette: same coordinate system/scale as the body (derived
 * from the user's real height), but only the region the garment covers,
 * and using the SIZE CHART's numbers instead of the user's own.
 *
 * region: 'upper' (tops/jackets) | 'lower' (jeans) | 'full' (dresses)
 */
export function buildGarmentSilhouette(sizeMeasurements, userHeightCm, region) {
  if (!userHeightCm) return null
  const scale = scaleFor(userHeightCm)
  const cx = VIEW_WIDTH / 2
  const toSvgY = (cmY) => cmY * scale
  const toSvgX = (halfCm) => halfCm * scale

  const shoulderHalf = (sizeMeasurements.shoulder_cm || 0) / 2
  const chestHalf = circumferenceToWidth(sizeMeasurements.chest_cm) / 2
  const waistHalf = circumferenceToWidth(sizeMeasurements.waist_cm) / 2
  const hipHalf = circumferenceToWidth(sizeMeasurements.hip_cm) / 2
  const inseam = sizeMeasurements.inseam_cm

  const neckY = userHeightCm * Y_RATIO.neck
  const shoulderY = userHeightCm * Y_RATIO.shoulder
  const chestY = userHeightCm * Y_RATIO.chest
  const waistY = userHeightCm * Y_RATIO.waist
  const hipY = userHeightCm * Y_RATIO.hip
  const crotchY = inseam ? userHeightCm - inseam : hipY + userHeightCm * 0.04
  const ankleY = userHeightCm

  let points = []
  if (region === 'upper') {
    points = [
      { y: neckY, half: shoulderHalf * 0.5 },
      { y: shoulderY, half: shoulderHalf },
      { y: chestY, half: chestHalf || shoulderHalf * 0.95 },
      { y: waistY, half: (waistHalf || shoulderHalf * 0.85) * 1.08 }, // tee hem, slightly loose
    ]
  } else if (region === 'lower') {
    const ankleHalf = (hipHalf || 20) * 0.22
    points = [
      { y: waistY, half: waistHalf || 20 },
      { y: hipY, half: hipHalf || 24 },
      { y: crotchY, half: (hipHalf || 24) * 0.45 },
      { y: crotchY + (ankleY - crotchY) * 0.5, half: ankleHalf * 1.3 },
      { y: ankleY, half: ankleHalf },
    ]
  } else {
    // full - dress: shoulders down to a flowy hemline partway down the legs
    const hemY = hipY + (ankleY - hipY) * 0.55
    points = [
      { y: neckY, half: shoulderHalf * 0.5 },
      { y: shoulderY, half: shoulderHalf },
      { y: chestY, half: chestHalf || shoulderHalf * 0.95 },
      { y: waistY, half: waistHalf || shoulderHalf * 0.85 },
      { y: hipY, half: hipHalf || shoulderHalf },
      { y: hemY, half: (hipHalf || shoulderHalf) * 1.25 }, // flare
    ]
  }

  const left = points.map((p) => [cx - toSvgX(p.half), toSvgY(p.y)])
  const right = points.map((p) => [cx + toSvgX(p.half), toSvgY(p.y)]).reverse()
  const path =
    'M ' + left.map((p) => p.join(',')).join(' L ') + ' L ' + right.map((p) => p.join(',')).join(' L ') + ' Z'

  return { path, viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}` }
}
