import React from 'react'
import { MessageCircle, X } from 'lucide-react'

/** The persistent floating bubble that toggles the chat window open/closed.
 * Kept as its own component (and always rendered) so opening/closing the
 * window never unmounts the toggle control itself. */
export default function ChatButton({ open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? 'Close chat' : 'Open Style Buddy chat'}
      className="fixed bottom-5 right-5 z-40 bg-gradient-to-br from-myntra-pink to-gamify-purple text-white rounded-full p-4 shadow-pop animate-pulseGlow"
    >
      {open ? <X size={24} /> : <MessageCircle size={24} />}
    </button>
  )
}
