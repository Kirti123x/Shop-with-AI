import React from 'react'
import { Star, ThumbsUp } from 'lucide-react'

export default function Reviews({ reviews = [], ratingAvg, ratingCount }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-myntra-teal text-white font-bold text-lg px-3 py-1.5 rounded-lg flex items-center gap-1">
          {ratingAvg} <Star size={16} className="fill-white" />
        </div>
        <p className="text-myntra-gray text-sm">{ratingCount} verified ratings & reviews</p>
      </div>

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="bg-myntra-teal/10 text-myntra-teal text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {r.rating} <Star size={10} className="fill-myntra-teal" />
              </span>
              <span className="font-semibold text-sm">{r.title}</span>
            </div>
            <p className="text-sm text-myntra-gray mt-1">{r.comment}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-myntra-gray">
              <span>{r.user_name}</span>
              <span>•</span>
              <span>Size bought: {r.size_bought}</span>
              <span>•</span>
              <span>{r.fit_feedback}</span>
              <span className="ml-auto flex items-center gap-1"><ThumbsUp size={12} /> Helpful</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
