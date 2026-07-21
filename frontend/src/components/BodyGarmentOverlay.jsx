import React from 'react'
import { Ruler, Info } from 'lucide-react'
import { useMeasurements } from '../MeasurementsContext.jsx'
import { useProfiles } from '../ProfilesContext.jsx'
import { buildBodySilhouette, buildGarmentSilhouette } from '../lib/silhouette.js'
import { getSizeChartEntry, CATEGORY_REGION } from '../sizeCharts.js'

export default function BodyGarmentOverlay({ category, size }) {
  const { measurements: liveMeasurements, hasMeasurements: hasLive } = useMeasurements()
  const { selectedProfile } = useProfiles()
  const measurements = selectedProfile ? selectedProfile.measurements : liveMeasurements
  const hasMeasurements = selectedProfile ? true : hasLive
  const region = CATEGORY_REGION[category]

  if (!region) return null // no meaningful silhouette for this category (e.g. Sneakers)

  if (!hasMeasurements) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-card text-center">
        <Ruler size={20} className="mx-auto text-myntra-pink mb-2" />
        <p className="text-sm font-semibold">See how this size fits your shape</p>
        <p className="text-xs text-myntra-gray mt-1">
          Use "Get my size" in the Style Buddy chat (bottom-right) to unlock a live fit preview here — it
          only stores 6 numbers, never a photo.
        </p>
      </div>
    )
  }

  const body = buildBodySilhouette(measurements)
  const sizeEntry = size ? getSizeChartEntry(category, size) : null
  const garment = sizeEntry ? buildGarmentSilhouette(sizeEntry, measurements.height_cm, region) : null

  return (
    <div className="bg-white rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Ruler size={15} className="text-myntra-pink" /> Fit preview
        </h3>
        {size && <span className="text-xs bg-myntra-bg px-2 py-0.5 rounded-full font-medium">Size {size}</span>}
      </div>

      <div className="flex justify-center bg-myntra-bg rounded-lg py-3">
        <svg viewBox={body.viewBox} className="h-64" xmlns="http://www.w3.org/2000/svg">
          {/* user's body silhouette */}
          <circle
            cx={body.headCircle.cx}
            cy={body.headCircle.cy}
            r={body.headCircle.r}
            fill="#282C3F"
            opacity={0.85}
          />
          <path d={body.torsoPath} fill="#282C3F" opacity={0.85} />

          {/* garment silhouette for the selected size, overlaid on top */}
          {garment && <path d={garment.path} fill="#FF3F6C" opacity={0.45} stroke="#FF3F6C" strokeWidth={1.5} />}
        </svg>
      </div>

      {!size && (
        <p className="text-xs text-myntra-gray mt-2 flex items-center gap-1">
          <Info size={12} /> Select a size above to preview it over your shape.
        </p>
      )}
      {size && garment && (
        <p className="text-xs text-myntra-gray mt-2 flex items-center gap-1">
          <Info size={12} /> Pink overlay = size {size}'s cut. Wider than your silhouette = looser fit,
          narrower = snugger fit.
        </p>
      )}
    </div>
  )
}
