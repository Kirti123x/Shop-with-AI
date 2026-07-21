import React, { useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { createRecognizer, isVoiceSupported } from './voice.js'

export default function VoiceButton({ language, onTranscript }) {
  const [listening, setListening] = useState(false)
  const recognizerRef = useRef(null)
  const supported = isVoiceSupported()

  const toggleListening = () => {
    if (!supported) return

    if (listening) {
      recognizerRef.current?.stop()
      setListening(false)
      return
    }

    const recognizer = createRecognizer({
      language,
      onResult: (transcript) => {
        onTranscript(transcript)
        setListening(false)
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    })
    if (!recognizer) return
    recognizerRef.current = recognizer
    setListening(true)
    recognizer.start()
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={listening ? 'Stop listening' : 'Speak your question'}
      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
        listening ? 'bg-red-500 text-white animate-pulseGlow' : 'bg-myntra-bg text-myntra-dark hover:bg-gray-200'
      }`}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  )
}
