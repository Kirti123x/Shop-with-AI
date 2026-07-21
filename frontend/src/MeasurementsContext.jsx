import React, { createContext, useContext, useEffect, useState } from 'react'

const MeasurementsContext = createContext(null)
const STORAGE_KEY = 'stylehub_measurements_v1'

// Intentionally the ONLY things ever persisted for "Get my size" - six
// numbers. No photo, no mask image, no raw pose data is stored here or
// anywhere else in the app.
const DEFAULTS = {
  height_cm: null,
  chest_cm: null,
  waist_cm: null,
  hip_cm: null,
  shoulder_cm: null,
  inseam_cm: null,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch (_) {}
  return { ...DEFAULTS }
}

export function MeasurementsProvider({ children }) {
  const [measurements, setMeasurementsState] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements))
  }, [measurements])

  const setMeasurements = (next) => setMeasurementsState((prev) => ({ ...prev, ...next }))
  const clearMeasurements = () => setMeasurementsState({ ...DEFAULTS })
  const hasMeasurements = Object.values(measurements).every((v) => v !== null)

  return (
    <MeasurementsContext.Provider value={{ measurements, setMeasurements, clearMeasurements, hasMeasurements }}>
      {children}
    </MeasurementsContext.Provider>
  )
}

export function useMeasurements() {
  return useContext(MeasurementsContext)
}
