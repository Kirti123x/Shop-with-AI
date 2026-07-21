// Thin wrapper around the browser's native Web Speech API.
// SpeechRecognition = speech-to-text (voice input)
// SpeechSynthesis   = text-to-speech (voice replies)

const SpeechRecognitionCtor =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export const isVoiceSupported = () =>
  !!SpeechRecognitionCtor && typeof window !== 'undefined' && !!window.speechSynthesis

const LANG_BCP47 = {
  en: 'en-IN',
  hi: 'hi-IN',
  hinglish: 'en-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  es: 'es-ES',
  fr: 'fr-FR',
}

export function createRecognizer({ language = 'en', onResult, onEnd, onError }) {
  if (!SpeechRecognitionCtor) return null
  const recognizer = new SpeechRecognitionCtor()
  recognizer.lang = LANG_BCP47[language] || 'en-IN'
  recognizer.interimResults = false
  recognizer.maxAlternatives = 1

  recognizer.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((r) => r[0].transcript)
      .join(' ')
    onResult?.(transcript)
  }
  recognizer.onend = () => onEnd?.()
  recognizer.onerror = (e) => onError?.(e)

  return recognizer
}

export function speak(text, language = 'en') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_BCP47[language] || 'en-IN'
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
