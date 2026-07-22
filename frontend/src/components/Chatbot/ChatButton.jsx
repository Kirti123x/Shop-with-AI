import React from 'react'
import { MessageCircle, X } from 'lucide-react'

/** The persistent floating bubble that toggles the chat panel open/closed.
 * Kept as its own component (and always rendered, at a higher z-index than
 * the docked panel) so it's never covered - when the panel is open it sits
 * just outside its left edge instead of behind it. */
export default function ChatButton({ open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? 'Close chat' : 'Open Style Buddy chat'}
      className={`fixed bottom-5 z-50 bg-gradient-to-br from-myntra-pink to-gamify-purple text-white rounded-full p-4 shadow-pop animate-pulseGlow transition-[right] duration-300 ease-in-out ${
        open ? 'right-5 md:right-[calc(40%_+_1.25rem)]' : 'right-5'
      }`}
    >
      {open ? <X size={24} /> : <MessageCircle size={24} />}
    </button>
  )
}
