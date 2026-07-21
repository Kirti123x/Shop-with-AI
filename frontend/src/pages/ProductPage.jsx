import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'
import ImageGallery from '../components/ImageGallery.jsx'
import Reviews from '../components/Reviews.jsx'
import PastOrders from '../components/PastOrders.jsx'
import BodyGarmentOverlay from '../components/BodyGarmentOverlay.jsx'
import { ShieldCheck, Truck, RotateCcw, MessageCircle } from 'lucide-react'

export default function ProductPage({ onProductLoaded }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)

  useEffect(() => {
    setProduct(null)
    api.getProduct(id).then((p) => {
      setProduct(p)
      setSelectedSize(null)
      onProductLoaded(p)
    })
    return () => onProductLoaded(null)
  }, [id])

  if (!product) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-myntra-gray">Loading product…</div>
  }

  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  const handleSelectSize = (size) => {
    setSelectedSize(size)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="grid md:grid-cols-2 gap-10">
        <ImageGallery images={product.images} />

        <div>
          <p className="text-sm font-semibold text-myntra-gray uppercase tracking-wide">{product.brand_name}</p>
          <h1 className="font-display text-2xl font-bold mt-1">{product.name}</h1>
          <p className="text-myntra-gray text-sm mt-1">{product.description}</p>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-2xl font-bold">₹{product.price}</span>
            {discount > 0 && (
              <>
                <span className="text-myntra-gray line-through">₹{product.mrp}</span>
                <span className="text-myntra-orange font-semibold text-sm">{discount}% OFF</span>
              </>
            )}
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold mb-2">
              Select size {product.most_ordered_size && (
                <span className="font-normal text-myntra-gray">(most picked: {product.most_ordered_size})</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes_available.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelectSize(s)}
                  className={`w-12 h-11 rounded-lg border text-sm font-medium transition-colors ${
                    selectedSize === s
                      ? 'bg-myntra-pink text-white border-myntra-pink'
                      : 'border-gray-300 hover:border-myntra-pink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-myntra-gray mt-2 flex items-center gap-1">
              <MessageCircle size={13} className="text-myntra-pink" />
              Not sure of your size? Ask the AI stylist chat (bottom-right) — it can estimate your
              measurements with a quick camera scan.
            </p>
          </div>

          <div className="mt-6">
            <BodyGarmentOverlay category={product.category} size={selectedSize} />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {}}
              className="flex-1 bg-myntra-pink hover:bg-myntra-pink-dark text-white font-semibold py-3 rounded-lg transition-colors animate-pulseGlow"
            >
              ADD TO BAG
            </button>
            <button className="flex-1 border border-myntra-pink text-myntra-pink font-semibold py-3 rounded-lg hover:bg-myntra-pink/5">
              WISHLIST
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <Perk icon={<Truck size={18} />} label="Free delivery" />
            <Perk icon={<RotateCcw size={18} />} label="Easy 14-day return" />
            <Perk icon={<ShieldCheck size={18} />} label="Genuine product" />
          </div>

          <div className="mt-8 bg-white rounded-xl p-4 shadow-card">
            <h3 className="font-semibold mb-2">Material & Care</h3>
            <p className="text-sm text-myntra-gray">
              <span className="font-medium text-myntra-dark">Fabric:</span> {product.material}
            </p>
            <p className="text-sm text-myntra-gray mt-1">
              <span className="font-medium text-myntra-dark">Quality notes:</span> {product.quality_notes}
            </p>
            <p className="text-sm text-myntra-gray mt-1">
              <span className="font-medium text-myntra-dark">Colors:</span>{' '}
              {product.colors_available.join(', ')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-10 mt-12">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <Reviews reviews={product.reviews} ratingAvg={product.rating_avg} ratingCount={product.rating_count} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card h-fit">
          <PastOrders orders={product.past_orders} mostOrderedSize={product.most_ordered_size} />
        </div>
      </div>
    </div>
  )
}

function Perk({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1 text-myntra-gray">
      <div className="text-myntra-pink">{icon}</div>
      <span className="text-xs">{label}</span>
    </div>
  )
}
