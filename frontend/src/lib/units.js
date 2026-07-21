export const CM_PER_INCH = 2.54

export function cmToIn(cm) {
  return cm / CM_PER_INCH
}

export function inToCm(inches) {
  return inches * CM_PER_INCH
}

export function cmToFeetInches(cm) {
  const totalInches = cm / CM_PER_INCH
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return { feet, inches }
}

export function feetInchesToCm(feet, inches) {
  return ((Number(feet) || 0) * 12 + (Number(inches) || 0)) * CM_PER_INCH
}
