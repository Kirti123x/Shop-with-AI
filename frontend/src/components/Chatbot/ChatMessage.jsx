import React from 'react'
import { Sparkles, User } from 'lucide-react'

export default function ChatMessage({ role, content, children }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-myntra-pink to-gamify-purple flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-myntra-pink text-white rounded-br-sm'
            : 'bg-white text-myntra-dark shadow-card rounded-bl-sm'
        }`}
      >
        {content && <p className="whitespace-pre-wrap">{content}</p>}
        {children}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-myntra-dark flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-white" />
        </div>
      )}
    </div>
  )
}
