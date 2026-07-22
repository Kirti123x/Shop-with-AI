import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import { Sparkles, MessageCircle } from 'lucide-react'

export default function Home() {
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState({ categories: [], brands: [] })
  const [activeCategory, setActiveCategory] = useState('')
  const [activeBrand, setActiveBrand] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getFilters().then(setFilters).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api
      .listProducts({ category: activeCategory, brand: activeBrand })
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [activeCategory, activeBrand])

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-myntra-pink via-myntra-pink-dark to-gamify-purple-dark">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-semibold mb-4">
            <Sparkles size={14} /> AI STYLIST INSIDE
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white max-w-2xl leading-tight">
            Shop smarter. Let AI find your fit.
          </h1>
          <p className="text-white/85 mt-3 max-w-xl">
            Chat with your AI stylist for outfit advice, get your measurements from a photo, and preview
            how any size fits your shape with the live silhouette visualiser — all without filling a
            single size form.
          </p>
          {/* <div className="mt-6 inline-flex items-center gap-2 bg-white text-myntra-pink font-semibold px-5 py-2.5 rounded-full shadow-pop">
            <MessageCircle size={18} /> Chat bubble bottom-right to start
          </div> */}
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute top-0 -left-10 w-40 h-40 bg-gamify-gold/20 rounded-full blur-2xl" />
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterChip label="All" active={!activeCategory} onClick={() => setActiveCategory('')} />
          {filters.categories.map((c) => (
            <FilterChip key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
          ))}
          <span className="w-px bg-gray-200 mx-1" />
          <FilterChip label="All brands" active={!activeBrand} onClick={() => setActiveBrand('')} tone="dark" />
          {filters.brands.map((b) => (
            <FilterChip key={b} label={b} active={activeBrand === b} onClick={() => setActiveBrand(b)} tone="dark" />
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterChip({ label, active, onClick, tone = 'pink' }) {
  const activeCls =
    tone === 'pink' ? 'bg-myntra-pink text-white' : 'bg-myntra-dark text-white'
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? activeCls : 'bg-white text-myntra-dark hover:bg-gray-100 shadow-card'
      }`}
    >
      {label}
    </button>
  )
}
