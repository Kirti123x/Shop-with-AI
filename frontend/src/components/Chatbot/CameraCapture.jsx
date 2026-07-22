import React, { useEffect, useRef, useState } from 'react'
import { Camera, X, Maximize2, Minimize2 } from 'lucide-react'

// Loaded from CDN as an ES module at runtime (not an npm dependency) so the
// live preview can show the same pose skeleton + landmark IDs that
// mp_drawing.draw_landmarks()/cv2.putText() drew in the original capture
// script - purely a visual aid while framing the shot. The actual
// measurements are still computed server-side by measurement_pipeline.py.
const TASKS_VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// Same skeleton edges mp_pose.POSE_CONNECTIONS draws (BlazePose 33-point model).
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
]

// Lazily created once and reused across every CameraCapture mount (front
// AND side steps), so the ~lite model is only downloaded/initialized once
// per session, not per photo.
let landmarkerPromise = null
function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import(/* @vite-ignore */ TASKS_VISION_CDN)
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
      return vision.PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        outputSegmentationMasks: true,
      })
    })().catch((err) => {
      landmarkerPromise = null // allow a retry on the next mount
      throw err
    })
  }
  return landmarkerPromise
}

export default function CameraCapture({ label, guideHint, onCapture, onCancel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null) // hidden - used only to grab the still frame
  const overlayRef = useRef(null) // visible - silhouette mask + live skeleton drawing
  const maskCanvasRef = useRef(null) // hidden - scratch canvas for compositing the raw mask buffer before it's scaled onto overlayRef
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [skeletonReady, setSkeletonReady] = useState(false)
  const [expanded, setExpanded] = useState(false) // "take out of chat window" / fullscreen mode

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

  // Live pose overlay - starts once the video is playing, stops on unmount.
  useEffect(() => {
    if (!ready) return
    let cancelled = false

    getPoseLandmarker()
      .then((landmarker) => {
        if (cancelled) return
        setSkeletonReady(true)

        const drawLoop = () => {
          const video = videoRef.current
          const canvas = overlayRef.current
          if (!video || !canvas || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(drawLoop)
            return
          }
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          const ctx = canvas.getContext('2d')

          const result = landmarker.detectForVideo(video, performance.now())

          // --- Silhouette (replaces the raw camera frame) ---
          // Solid fill first, so there's a defined background even where
          // the mask doesn't cover the full canvas (e.g. mask smaller than
          // the frame, or nothing detected yet).
          ctx.fillStyle = '#0a0a0a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          const maskObj = result?.segmentationMasks?.[0]
          if (maskObj) {
            const mw = maskObj.width
            const mh = maskObj.height
            const maskData = maskObj.getAsUint8Array() // one byte per pixel, 0-255 "is a person" confidence

            if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement('canvas')
            const maskCanvas = maskCanvasRef.current
            if (maskCanvas.width !== mw || maskCanvas.height !== mh) {
              maskCanvas.width = mw
              maskCanvas.height = mh
            }
            const maskCtx = maskCanvas.getContext('2d')

            // Pack pixels via a Uint32Array view for speed (avoids a 4-write
            // per-pixel loop at video framerate). Browsers are little-endian,
            // so a packed uint32 is read back as RGBA in that byte order.
            const buf = new ArrayBuffer(mw * mh * 4)
            const buf8 = new Uint8ClampedArray(buf)
            const buf32 = new Uint32Array(buf)
            const ON_COLOR = 0xffff3f6c // opaque, brand pink (silhouette)   - 0xAABBGGRR
            const OFF_COLOR = 0xff0f0f0f // opaque, near-black (background)
            for (let i = 0; i < maskData.length; i++) {
              buf32[i] = maskData[i] > 128 ? ON_COLOR : OFF_COLOR
            }
            maskCtx.putImageData(new ImageData(buf8, mw, mh), 0, 0)

            // Scale the mask's native resolution up to the overlay canvas.
            ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height)
            maskObj.close() // MPMask wraps WASM/GPU memory - must be explicitly freed
          }

          // --- Skeleton, drawn on top of the silhouette ---
          const landmarks = result?.landmarks?.[0]
          if (landmarks) {
            const px = (lm) => [lm.x * canvas.width, lm.y * canvas.height]

            // skeleton connections, like mp_drawing's red connection spec
            ctx.strokeStyle = '#FF3B30'
            ctx.lineWidth = 2
            for (const [a, b] of POSE_CONNECTIONS) {
              if (!landmarks[a] || !landmarks[b]) continue
              const [ax, ay] = px(landmarks[a])
              const [bx, by] = px(landmarks[b])
              ctx.beginPath()
              ctx.moveTo(ax, ay)
              ctx.lineTo(bx, by)
              ctx.stroke()
            }

            // landmark points + IDs, like mp_drawing's green landmark spec
            // and the cv2.putText(str(idx)) labels
            landmarks.forEach((lm, idx) => {
              const [x, y] = px(lm)
              ctx.fillStyle = '#22C55E'
              ctx.beginPath()
              ctx.arc(x, y, 3, 0, 2 * Math.PI)
              ctx.fill()

              ctx.fillStyle = '#2563EB'
              ctx.font = '9px monospace'
              ctx.fillText(String(idx), x + 4, y - 4)
            })
          }

          rafRef.current = requestAnimationFrame(drawLoop)
        }
        rafRef.current = requestAnimationFrame(drawLoop)
      })
      .catch(() => {
        // Live skeleton is a nice-to-have preview - if the model can't load
        // (no network, CDN blocked, etc.) capture still works fine without it.
        setSkeletonReady(false)
      })

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready])

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
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
    <div
      className={
        expanded
          ? 'fixed inset-0 z-[100] bg-myntra-dark flex flex-col p-4 md:p-8'
          : 'bg-myntra-bg rounded-xl p-3 space-y-2'
      }
    >
      <div className={expanded ? 'flex items-center justify-between mb-3 shrink-0' : 'flex items-center justify-between'}>
        <p className={expanded ? 'text-sm font-medium text-white' : 'text-xs font-medium text-myntra-dark'}>{label}</p>
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Exit fullscreen' : 'Take capture full screen'}
          className={expanded ? 'text-white/80 hover:text-white p-1' : 'text-myntra-gray hover:text-myntra-dark p-1'}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={13} />}
        </button>
      </div>

      <div
        className={
          expanded
            ? 'relative rounded-lg overflow-hidden bg-black flex-1 w-full max-w-md mx-auto min-h-0'
            : 'relative rounded-lg overflow-hidden bg-black'
        }
        style={expanded ? undefined : { aspectRatio: '3 / 4' }}
      >
        {/* Real camera feed stays mounted (it's what detectForVideo() reads
            and what capture() snapshots), but it's never shown - only the
            silhouette + skeleton drawn from it are visible below. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Solid backdrop for the brief window before the first mask frame
            is ready, so raw video is never what flashes into view. */}
        <div className="absolute inset-0 bg-black" />
        {/* Silhouette mask + live pose skeleton, mirrored to match the
            (hidden) selfie-facing video so points line up with framing. */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* static outline guide - purely visual, not sent anywhere */}
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
          {ready && !skeletonReady ? 'Loading pose tracking…' : guideHint}
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className={expanded ? 'flex gap-3 w-full max-w-md mx-auto mt-3 shrink-0' : 'flex gap-2'}>
        <button
          onClick={capture}
          disabled={!ready}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-myntra-pink text-white py-2 rounded-full disabled:opacity-40"
        >
          <Camera size={14} /> Capture
        </button>
        <button
          onClick={onCancel}
          className={
            expanded
              ? 'flex items-center justify-center text-xs text-white px-3 rounded-full hover:bg-white/10'
              : 'flex items-center justify-center text-xs text-myntra-gray px-3 rounded-full hover:bg-white'
          }
        >
          <X size={14} />
        </button>
      </div>
      <p
        className={
          expanded
            ? 'text-[10px] text-white/60 text-center shrink-0'
            : 'text-[10px] text-myntra-gray text-center'
        }
      >
        Nothing is saved — this frame is processed once and discarded immediately.
      </p>
    </div>
  )
}
