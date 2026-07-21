import React from 'react'

export default function TemplateQuestions({ questions = [], onPick }) {
  if (questions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="text-xs bg-white border border-myntra-pink/30 text-myntra-pink font-medium px-2.5 py-1.5 rounded-full hover:bg-myntra-pink hover:text-white transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
