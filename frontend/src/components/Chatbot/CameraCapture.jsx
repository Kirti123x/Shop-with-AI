import React, { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

export default function CameraCapture({ label, guideHint, onCapture, onCancel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {})
            setReady(true)
          }
        }
      })
      .catch(() => setError('Camera access was denied or is unavailable. Check your browser permissions.'))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

    // Stop the camera the instant we have the frame, and wipe the canvas
    // pixel buffer right after extracting it - nothing is written to disk,
    // downloaded, or kept around beyond this function call.
    streamRef.current?.getTracks().forEach((t) => t.stop())
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    onCapture(base64)
  }

  if (error) {
    return (
      <div className="bg-myntra-bg rounded-xl p-4 text-center">
        <p className="text-xs text-red-500 mb-2">{error}</p>
        <button onClick={onCancel} className="text-xs text-myntra-gray underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="bg-myntra-bg rounded-xl p-3 space-y-2">
      <p className="text-xs font-medium text-myntra-dark">{label}</p>

      <div className="relative rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '3 / 4' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* on-screen outline guide - purely visual, not sent anywhere */}
        <svg viewBox="0 0 100 130" className="absolute inset-0 w-full h-full pointer-events-none opacity-70">
          <ellipse cx="50" cy="13" rx="8" ry="10" fill="none" stroke="#FF3F6C" strokeWidth="1.2" strokeDasharray="3 2" />
          <path
            d="M 36 26 Q 50 19 64 26 L 68 66 L 63 126 M 37 66 L 32 126"
            fill="none"
            stroke="#FF3F6C"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
        </svg>
        <p className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-white bg-black/45 rounded-full py-1 px-2">
          {guideHint}
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2">
        <button
          onClick={capture}
          disabled={!ready}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-myntra-pink text-white py-2 rounded-full disabled:opacity-40"
        >
          <Camera size={14} /> Capture
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center text-xs text-myntra-gray px-3 rounded-full hover:bg-white"
        >
          <X size={14} />
        </button>
      </div>
      <p className="text-[10px] text-myntra-gray text-center">
        Nothing is saved — this frame is processed once and discarded immediately.
      </p>
    </div>
  )
}
