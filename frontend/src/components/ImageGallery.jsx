import React, { useState } from 'react'

export default function ImageGallery({ images = [] }) {
  const [active, setActive] = useState(0)
  if (images.length === 0) return null
  const hasMultiple = images.length > 1

  return (
    <div className="flex gap-3">
      {hasMultiple && (
        <div className="hidden md:flex flex-col gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                active === i ? 'border-myntra-pink' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 rounded-xl overflow-hidden bg-myntra-bg aspect-[4/5] max-h-[560px]">
        <img src={images[active].url} alt={images[active].alt} className="w-full h-full object-cover" />
      </div>
      {hasMultiple && (
        <div className="flex md:hidden gap-2 absolute mt-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full ${active === i ? 'bg-myntra-pink' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
