import React from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

export default function ProductCard({ product }) {
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  return (
    <Link
      to={`/product/${product.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-card hover:shadow-pop transition-all duration-200 hover:-translate-y-1 block"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-myntra-bg">
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-myntra-gray uppercase tracking-wide">{product.brand_name}</p>
        <p className="text-sm text-myntra-dark line-clamp-2 mt-0.5">{product.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-bold text-sm">₹{product.price}</span>
          {discount > 0 && (
            <>
              <span className="text-xs text-myntra-gray line-through">₹{product.mrp}</span>
              <span className="text-xs text-myntra-orange font-semibold">{discount}% OFF</span>
            </>
          )}
        </div>
        {product.rating_avg > 0 && (
          <div className="flex items-center gap-1 mt-1.5 bg-myntra-teal/10 w-fit px-1.5 py-0.5 rounded">
            <span className="text-xs font-semibold text-myntra-teal">{product.rating_avg}</span>
            <Star size={11} className="fill-myntra-teal text-myntra-teal" />
            <span className="text-[11px] text-myntra-gray">({product.rating_count})</span>
          </div>
        )}
      </div>
    </Link>
  )
}
