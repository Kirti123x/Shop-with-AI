import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'
import { useMeasurements } from '../../MeasurementsContext.jsx'
import { useProfiles } from '../../ProfilesContext.jsx'
import ChatButton from './ChatButton.jsx'
import ChatWindow from './ChatWindow.jsx'
import { speak, stopSpeaking } from './voice.js'

function newSessionId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `sess-${Date.now()}-${Math.random()}`
}

// `open`/`onToggle` are controlled by App.jsx (rather than owned here) so the
// page layout can shrink to 60% width in step with the chat panel docking
// open at 40% - both need to react to the same boolean.
export default function ChatWidget({ activeProduct, open, onToggle }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm Style Buddy, your AI fashion stylist. Ask me anything about fit, fabric, or styling — or use the quick actions below.",
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [language, setLanguage] = useState('en')
  const [languages, setLanguages] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [sessionId] = useState(newSessionId)
  const scrollRef = useRef(null)
  const { setMeasurements } = useMeasurements()
  const { saveProfile } = useProfiles()

  useEffect(() => {
    api.getLanguages().then(setLanguages).catch(() => {})
  }, [])

  useEffect(() => {
    api
      .getSuggestions(activeProduct?.id)
      .then((d) => setSuggestions(d.questions))
      .catch(() => setSuggestions([]))
  }, [activeProduct?.id])

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const toggleOpen = () => {
    if (open) stopSpeaking()
    onToggle()
  }

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const history = messages
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((m) => [...m, { role: 'user', content: trimmed }])
    setInput('')
    setSending(true)

    try {
      const res = await api.sendChat({
        session_id: sessionId,
        message: trimmed,
        product_id: activeProduct?.id || null,
        language,
        history,
      })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
      if (autoSpeak) speak(res.reply, language)
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            err.message?.includes('GROQ_API_KEY')
              ? "The stylist isn't fully set up yet — add your Groq API key in backend/.env to enable live answers."
              : `Sorry, I hit a snag: ${err.message}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const openMeasurementTool = () => {
    setMessages((m) => [
      ...m,
      { role: 'user', content: 'Get my size' },
      {
        role: 'assistant',
        content:
          "Sure! I'll take a quick front and side shot with your camera and estimate your measurements — nothing is saved, and you can fine-tune every value and give this profile a name before saving it.",
        widget: 'measurement',
      },
    ])
  }

  const openVisualizeCompare = () => {
    setMessages((m) => [
      ...m,
      { role: 'user', content: 'Visualise & compare' },
      {
        role: 'assistant',
        content: activeProduct
          ? `Here's how "${activeProduct.name}" compares to your shape — pick a size, or search for a second product to compare it against.`
          : 'Open a product page first, then I can preview it against your shape here.',
        widget: 'compare',
      },
    ])
  }

  const handleSaveProfile = (measurements, name) => {
    setMeasurements(measurements)
    saveProfile(name, measurements)
  }

  return (
    <>
      <ChatButton open={open} onToggle={toggleOpen} />
      {open && (
        <ChatWindow
          activeProduct={activeProduct}
          messages={messages}
          sending={sending}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          language={language}
          languages={languages}
          setLanguage={setLanguage}
          autoSpeak={autoSpeak}
          setAutoSpeak={setAutoSpeak}
          suggestions={suggestions}
          scrollRef={scrollRef}
          onClose={toggleOpen}
          onOpenMeasurementTool={openMeasurementTool}
          onOpenVisualizeCompare={openVisualizeCompare}
          onSaveProfile={handleSaveProfile}
        />
      )}
    </>
  )
}
