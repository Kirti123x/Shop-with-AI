import React from 'react'
import { Send, Ruler, Eye, Volume2, VolumeX, MessageCircle, X } from 'lucide-react'
import ChatMessage from './ChatMessage.jsx'
import LanguageSelector from './LanguageSelector.jsx'
import VoiceButton from './VoiceButton.jsx'
import TemplateQuestions from './TemplateQuestions.jsx'
import MeasurementSliders from './MeasurementSliders.jsx'
import ChatCompare from './ChatCompare.jsx'

export default function ChatWindow({
  activeProduct,
  messages,
  sending,
  input,
  setInput,
  sendMessage,
  language,
  languages,
  setLanguage,
  autoSpeak,
  setAutoSpeak,
  suggestions,
  scrollRef,
  onClose,
  onOpenMeasurementTool,
  onOpenVisualizeCompare,
  onSaveProfile,
}) {
  return (
    <div className="fixed bottom-5 right-5 z-40 w-[92vw] max-w-lg h-[100vh] max-h-[720px] bg-myntra-bg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-popIn">
      {/* header */}
      <div className="bg-gradient-to-r from-myntra-pink to-gamify-purple-dark px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm leading-tight">Style Buddy</p>
          <p className="text-white/70 text-[11px] leading-tight">
            {activeProduct ? `Chatting about: ${activeProduct.name}` : 'Your AI fashion stylist'}
          </p>
        </div>
        <button
          onClick={() => setAutoSpeak((v) => !v)}
          title="Toggle voice replies"
          className="text-white/80 hover:text-white p-1"
        >
          {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <LanguageSelector languages={languages} value={language} onChange={setLanguage} />
        <button onClick={onClose} className="text-white/80 hover:text-white p-1" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      {/* quick actions */}
      <div className="flex gap-2 px-3 pt-2.5">
        <button
          onClick={onOpenMeasurementTool}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-white text-myntra-dark py-2 rounded-full shadow-card hover:bg-gray-50"
        >
          <Ruler size={14} className="text-myntra-pink" /> Get my size
        </button>
        <button
          onClick={onOpenVisualizeCompare}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-white text-myntra-dark py-2 rounded-full shadow-card hover:bg-gray-50"
        >
          <Eye size={14} className="text-myntra-pink" /> Visualise &amp; Compare
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content}>
            {m.widget === 'measurement' && (
              <MeasurementSliders onConfirm={(vals, name) => onSaveProfile(vals, name)} />
            )}
            {m.widget === 'compare' && <ChatCompare product={activeProduct} />}
          </ChatMessage>
        ))}
        {sending && <ChatMessage role="assistant" content="Typing…" />}
      </div>

      {/* template questions */}
      {/* <div className="px-3 pb-2">
        <TemplateQuestions questions={suggestions} onPick={sendMessage} />
      </div> */}

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input)
        }}
        className="flex items-center gap-2 p-3 bg-white border-t border-gray-100"
      >
        <VoiceButton language={language} onTranscript={(t) => sendMessage(t)} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about fit, fabric, styling…"
          className="flex-1 bg-myntra-bg rounded-full px-3.5 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-9 h-9 shrink-0 rounded-full bg-myntra-pink text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
