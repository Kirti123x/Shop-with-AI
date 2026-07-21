import React from 'react'
import { Languages } from 'lucide-react'

const FALLBACK_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hinglish', label: 'Hinglish' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'mr', label: 'Marathi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
]

export default function LanguageSelector({ languages, value, onChange }) {
  const options = languages && languages.length ? languages : FALLBACK_LANGUAGES
  return (
    <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2 py-1">
      <Languages size={14} className="text-white" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white text-xs font-medium outline-none cursor-pointer"
      >
        {options.map((l) => (
          <option key={l.code} value={l.code} className="text-myntra-dark">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
