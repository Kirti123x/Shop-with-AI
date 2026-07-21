// Approximate body measurements each size is cut to fit, per category —
// this IS the shop's own size-chart data (StyleHub's catalog only has these
// four categories with a meaningful body silhouette; Sneakers are omitted
// on purpose, same as before, since there's no torso/leg shape to draw).
//
// Alongside chest/waist/hip/shoulder (used for both the body AND garment
// outline) each entry now also carries a `length_cm` (and `sleeve_cm` for
// tops) so the same catalog data can feed the "Visualise & Compare" fit
// engine (frontend/src/lib/bodyGarmentEngine.js), which needs a garment
// LENGTH in addition to its girths to draw a hem line.

export const SIZE_CHARTS = {
  'T-Shirts': {
    S: { chest_cm: 92, waist_cm: 80, shoulder_cm: 42, hip_cm: 92, length_cm: 68, sleeve_cm: 20 },
    M: { chest_cm: 98, waist_cm: 86, shoulder_cm: 44, hip_cm: 98, length_cm: 70, sleeve_cm: 21 },
    L: { chest_cm: 104, waist_cm: 92, shoulder_cm: 46, hip_cm: 104, length_cm: 72, sleeve_cm: 22 },
    XL: { chest_cm: 110, waist_cm: 98, shoulder_cm: 48, hip_cm: 110, length_cm: 74, sleeve_cm: 23 },
    XXL: { chest_cm: 116, waist_cm: 104, shoulder_cm: 50, hip_cm: 116, length_cm: 76, sleeve_cm: 24 },
  },
  Jackets: {
    S: { chest_cm: 96, waist_cm: 84, shoulder_cm: 44, hip_cm: 96, length_cm: 64, sleeve_cm: 59 },
    M: { chest_cm: 102, waist_cm: 90, shoulder_cm: 46, hip_cm: 102, length_cm: 66, sleeve_cm: 60 },
    L: { chest_cm: 108, waist_cm: 96, shoulder_cm: 48, hip_cm: 108, length_cm: 68, sleeve_cm: 61 },
    XL: { chest_cm: 114, waist_cm: 102, shoulder_cm: 50, hip_cm: 114, length_cm: 70, sleeve_cm: 62 },
    XXL: { chest_cm: 120, waist_cm: 108, shoulder_cm: 52, hip_cm: 120, length_cm: 72, sleeve_cm: 63 },
  },
  Jeans: {
    28: { waist_cm: 71, hip_cm: 92, inseam_cm: 74, length_cm: 100, legOpening_cm: 15 },
    30: { waist_cm: 76, hip_cm: 97, inseam_cm: 76, length_cm: 102, legOpening_cm: 16 },
    32: { waist_cm: 81, hip_cm: 102, inseam_cm: 78, length_cm: 104, legOpening_cm: 17 },
    34: { waist_cm: 86, hip_cm: 107, inseam_cm: 80, length_cm: 106, legOpening_cm: 18 },
    36: { waist_cm: 91, hip_cm: 112, inseam_cm: 82, length_cm: 108, legOpening_cm: 19 },
    38: { waist_cm: 96, hip_cm: 117, inseam_cm: 84, length_cm: 110, legOpening_cm: 20 },
  },
  Dresses: {
    XS: { chest_cm: 84, waist_cm: 66, hip_cm: 90, shoulder_cm: 37, inseam_cm: 60, length_cm: 98 },
    S: { chest_cm: 88, waist_cm: 70, hip_cm: 94, shoulder_cm: 38, inseam_cm: 62, length_cm: 100 },
    M: { chest_cm: 92, waist_cm: 74, hip_cm: 98, shoulder_cm: 39, inseam_cm: 64, length_cm: 102 },
    L: { chest_cm: 98, waist_cm: 80, hip_cm: 104, shoulder_cm: 40, inseam_cm: 66, length_cm: 104 },
    XL: { chest_cm: 104, waist_cm: 86, hip_cm: 110, shoulder_cm: 41, inseam_cm: 68, length_cm: 106 },
  },
}

// Which body region each category's garment covers, used to clip the
// garment silhouette so a T-shirt doesn't draw legs, jeans don't draw a
// torso, etc. (Legacy - still used by the older single-garment overlay.)
export const CATEGORY_REGION = {
  'T-Shirts': 'upper',
  Jackets: 'upper',
  Jeans: 'lower',
  Dresses: 'full',
}

// Maps StyleHub's own catalog category names to the garment-class keys the
// fit-comparison engine (bodyGarmentEngine.js) understands.
export const CATEGORY_TO_ENGINE = {
  'T-Shirts': 'tshirt',
  Jackets: 'jacket',
  Jeans: 'jeans',
  Dresses: 'dress',
}

export function getSizeChartEntry(category, size) {
  return SIZE_CHARTS[category]?.[size] || null
}

/**
 * Builds the exact shape bodyGarmentEngine.js expects (category, shoulder,
 * chest, waist, hip, sleeve, length, legOpening, label, brand) straight out
 * of StyleHub's own size chart + a real product's name/brand — no
 * standalone/independent sample data involved.
 */
export function toEngineGarment(product, size) {
  if (!product || !size) return null
  const entry = getSizeChartEntry(product.category, size)
  if (!entry) return null
  return {
    category: CATEGORY_TO_ENGINE[product.category] || 'tshirt',
    shoulder: entry.shoulder_cm,
    chest: entry.chest_cm,
    waist: entry.waist_cm,
    hip: entry.hip_cm,
    sleeve: entry.sleeve_cm,
    length: entry.length_cm,
    legOpening: entry.legOpening_cm,
    label: `${product.name} (${size})`,
    brand: product.brand_name,
  }
}
