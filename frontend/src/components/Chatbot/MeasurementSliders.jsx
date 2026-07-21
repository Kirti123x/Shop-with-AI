import React, { useState } from 'react'
import { Loader2, Check, RefreshCcw, User, ArrowRight } from 'lucide-react'
import { api } from '../../api.js'
import { cmToIn, inToCm, feetInchesToCm, cmToFeetInches } from '../../lib/units.js'
import CameraCapture from './CameraCapture.jsx'

const LABELS = {
  height_cm: 'Height',
  chest_cm: 'Chest',
  waist_cm: 'Waist',
  hip_cm: 'Hip',
  shoulder_cm: 'Shoulder',
  inseam_cm: 'Inseam',
}

export default function MeasurementSliders({ onConfirm }) {
  // height -> capture-front -> capture-side -> loading -> ready
  const [step, setStep] = useState('height')
  const [feet, setFeet] = useState(5)
  const [inches, setInches] = useState(7)
  const [frontB64, setFrontB64] = useState(null) // held only transiently, in memory
  const [measurements, setMeasurements] = useState(null) // canonical values, always cm
  const [bounds, setBounds] = useState(null) // cm bounds from API
  const [source, setSource] = useState(null)
  const [pipelineMsg, setPipelineMsg] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [profileName, setProfileName] = useState('')

  const heightCm = feetInchesToCm(feet, inches)
  const heightValid = heightCm >= 140 && heightCm <= 230

  const handleEstimate = async (front, side) => {
    setStep('loading')
    setConfirmed(false)
    try {
      const result = await api.estimateMeasurements(front, side, Math.round(heightCm))
      setMeasurements(result.measurements) // cm
      setBounds(result.bounds) // cm
      setSource(result.source)
      setPipelineMsg(result.message)
      setStep('ready')
    } catch (err) {
      setStep('height')
      alert(err.message || 'Could not process those frames. Please try again.')
    } finally {
      // frames only ever needed to exist for the duration of this request
      setFrontB64(null)
    }
  }

  const updateValueInches = (key, inchesValue) => {
    setMeasurements((m) => ({ ...m, [key]: inToCm(Number(inchesValue)) }))
    setConfirmed(false)
  }

  const reset = () => {
    setStep('height')
    setMeasurements(null)
    setFrontB64(null)
    setProfileName('')
  }

  if (step === 'height') {
    return (
      <div className="mt-2 bg-white border border-myntra-pink/20 rounded-xl p-3.5 space-y-3">
        <div>
          <label className="text-xs font-medium text-myntra-dark flex items-center gap-1 mb-1">
            <User size={13} className="text-myntra-pink" /> Your height
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={4}
                max={7}
                value={feet}
                onChange={(e) => setFeet(e.target.value)}
                className="w-14 bg-myntra-bg rounded-lg px-2 py-1.5 text-sm outline-none"
              />
              <span className="text-xs text-myntra-gray">ft</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={11}
                value={inches}
                onChange={(e) => setInches(e.target.value)}
                className="w-14 bg-myntra-bg rounded-lg px-2 py-1.5 text-sm outline-none"
              />
              <span className="text-xs text-myntra-gray">in</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-myntra-gray">
          Next you'll take a front-facing and a side-facing shot with your camera — align yourself with
          the on-screen outline, arms slightly away from your body.
        </p>

        <button
          onClick={() => setStep('capture-front')}
          disabled={!heightValid}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-myntra-pink text-white py-2 rounded-full disabled:opacity-40"
        >
          Open camera <ArrowRight size={13} />
        </button>
      </div>
    )
  }

  if (step === 'capture-front') {
    return (
      <div className="mt-2">
        <CameraCapture
          key="front"
          label="Front-facing shot"
          guideHint="Face the camera, full body in frame"
          onCapture={(b64) => {
            setFrontB64(b64)
            setStep('capture-side')
          }}
          onCancel={() => setStep('height')}
        />
      </div>
    )
  }

  if (step === 'capture-side') {
    return (
      <div className="mt-2">
        <CameraCapture
          key="side"
          label="Side-facing shot"
          guideHint="Turn sideways, full body in frame"
          onCapture={(b64) => handleEstimate(frontB64, b64)}
          onCancel={() => setStep('capture-front')}
        />
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="mt-2 flex items-center gap-2 bg-myntra-bg rounded-xl p-4 text-xs text-myntra-gray">
        <Loader2 size={16} className="animate-spin text-myntra-pink" />
        Analyzing your captures…
      </div>
    )
  }

  return (
    <div className="mt-2 bg-myntra-bg rounded-xl p-3.5 space-y-3">
      <p className="text-xs text-myntra-gray">
        {source === 'pipeline'
          ? 'Estimated from your camera captures — drag to fine-tune any value (in inches).'
          : `Using average defaults (${pipelineMsg || 'estimation unavailable'}) — please adjust to match you.`}
      </p>

      {Object.entries(measurements).map(([key, cmValue]) => {
        const [loCm, hiCm] = bounds[key]
        const inValue = cmToIn(cmValue)
        const loIn = cmToIn(loCm)
        const hiIn = cmToIn(hiCm)
        const isHeight = key === 'height_cm'
        const { feet: fDisp, inches: iDisp } = isHeight ? cmToFeetInches(cmValue) : { feet: 0, inches: 0 }

        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-myntra-dark">{LABELS[key] || key}</span>
              <span className="text-myntra-pink font-semibold">
                {isHeight ? `${fDisp}'${iDisp}" (${inValue.toFixed(1)} in)` : `${inValue.toFixed(1)} in`}
              </span>
            </div>
            <input
              type="range"
              min={loIn}
              max={hiIn}
              step={0.5}
              value={inValue}
              onChange={(e) => updateValueInches(key, e.target.value)}
              className="w-full accent-myntra-pink"
            />
          </div>
        )
      })}

      <div>
        <label className="text-xs font-medium text-myntra-dark flex items-center gap-1 mb-1">
          <User size={13} className="text-myntra-pink" /> Save this profile as
        </label>
        <input
          type="text"
          value={profileName}
          onChange={(e) => {
            setProfileName(e.target.value)
            setConfirmed(false)
          }}
          placeholder="e.g. Me, Mom, Rahul…"
          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            setConfirmed(true)
            onConfirm?.(measurements, profileName.trim() || 'Me') // always passes cm - canonical unit for storage
          }}
          disabled={confirmed || !profileName.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-myntra-pink text-white py-2 rounded-full disabled:opacity-60"
        >
          <Check size={14} /> {confirmed ? 'Saved to profile' : 'Save this profile'}
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center gap-1 text-xs font-medium text-myntra-gray px-3 py-2 rounded-full hover:bg-white"
        >
          <RefreshCcw size={13} /> Retake
        </button>
      </div>
    </div>
  )
}
