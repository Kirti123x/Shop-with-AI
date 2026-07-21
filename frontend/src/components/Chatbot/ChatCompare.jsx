import React, { useMemo, useState } from 'react'
import { Search, Ruler, Eye, EyeOff, User, X, Info } from 'lucide-react'
import { api } from '../../api.js'
import { useMeasurements } from '../../MeasurementsContext.jsx'
import { useProfiles } from '../../ProfilesContext.jsx'
import { CATEGORY_REGION, toEngineGarment } from '../../sizeCharts.js'
import { VB_W, VB_H, CENTER_X, has, classifyEase, generateOutlines } from '../../lib/bodyGarmentEngine.js'

const LAYER_META = {
  body: { color: '#6B7280', label: 'Your body' },
  compare: { color: '#2E9E5B', label: 'Compare with' },
  current: { color: '#2563EB', label: 'This product' },
}

function toEngineBody(m) {
  if (!m) return null
  return { height: m.height_cm, shoulder: m.shoulder_cm, chest: m.chest_cm, waist: m.waist_cm, hip: m.hip_cm }
}

/** "Visualise & Compare" - draws the selected person's body silhouette
 * against the currently-open product AND a second, searched-for product,
 * both fed from StyleHub's own size charts (see sizeCharts.js). */
export default function ChatCompare({ product }) {
  const { measurements: liveMeasurements, hasMeasurements: hasLive } = useMeasurements()
  const { profiles, selectedProfile, selectProfile } = useProfiles()

  const bodySource = selectedProfile
    ? { name: selectedProfile.name, measurements: selectedProfile.measurements }
    : hasLive
    ? { name: 'Me', measurements: liveMeasurements }
    : null

  const [currentSize, setCurrentSize] = useState(product?.sizes_available?.[0] || null)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [compareProduct, setCompareProduct] = useState(null)
  const [compareSize, setCompareSize] = useState(null)

  const [visible, setVisible] = useState({ body: true, compare: true, current: true })

  const runSearch = async (e) => {
    e?.preventDefault?.()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    try {
      const data = await api.listProducts({ search: q, category: product.category })
      setResults((data.products || []).filter((p) => p.id !== product.id).slice(0, 6))
    } catch (_) {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const pickCompareProduct = async (p) => {
    try {
      const full = await api.getProduct(p.id)
      setCompareProduct(full)
      setCompareSize(full.sizes_available?.[0] || null)
      setResults([])
      setQuery('')
    } catch (_) {}
  }

  const body = toEngineBody(bodySource?.measurements)
  const currentGarment = product && currentSize ? toEngineGarment(product, currentSize) : null
  const compareGarment = compareProduct && compareSize ? toEngineGarment(compareProduct, compareSize) : null

  const outlines = useMemo(() => {
    if (!body?.height) return null
    return generateOutlines({
      body,
      previousGarment: compareGarment || { category: 'tshirt' },
      currentGarment: currentGarment || { category: 'tshirt' },
    })
  }, [body, compareGarment, currentGarment])

  if (!product) {
    return (
      <p className="mt-2 text-xs text-myntra-gray bg-myntra-bg rounded-xl p-3">
        Open a product first, then tap "Visualise & Compare" again to preview it on your shape.
      </p>
    )
  }

  if (!CATEGORY_REGION[product.category]) {
    return (
      <p className="mt-2 text-xs text-myntra-gray bg-myntra-bg rounded-xl p-3">
        No fit preview available for {product.category} yet — try a T-Shirt, Jacket, Jeans, or Dress.
      </p>
    )
  }

  if (!bodySource) {
    return (
      <div className="mt-2 bg-white rounded-xl p-4 shadow-card text-center">
        <Ruler size={18} className="mx-auto text-myntra-pink mb-2" />
        <p className="text-sm font-semibold">See how this fits your shape</p>
        <p className="text-xs text-myntra-gray mt-1">
          Use "Get my size" first — save it with a name and it'll show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2.5">
      {/* whose body to preview */}
      {profiles.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-myntra-gray uppercase tracking-wide mb-1">Previewing on</p>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProfile(p.id)}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                  selectedProfile?.id === p.id
                    ? 'bg-myntra-pink text-white border-myntra-pink'
                    : 'bg-white border-gray-300'
                }`}
              >
                <User size={11} /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* size of the currently open product */}
      <div>
        <p className="text-[10px] font-semibold text-myntra-gray uppercase tracking-wide mb-1">
          {product.name} — size
        </p>
        <div className="flex flex-wrap gap-1.5">
          {product.sizes_available.map((s) => (
            <button
              key={s}
              onClick={() => setCurrentSize(s)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                currentSize === s ? 'bg-myntra-pink text-white border-myntra-pink' : 'bg-white border-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* search for a second product to compare against */}
      <div>
        <p className="text-[10px] font-semibold text-myntra-gray uppercase tracking-wide mb-1">
          Compare with another {product.category.replace(/s$/, '')}
        </p>
        {compareProduct ? (
          <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-gray-200">
            <span className="text-xs flex-1 truncate">{compareProduct.name}</span>
            <div className="flex gap-1">
              {compareProduct.sizes_available.map((s) => (
                <button
                  key={s}
                  onClick={() => setCompareSize(s)}
                  className={`text-[11px] px-1.5 py-0.5 rounded-full border ${
                    compareSize === s ? 'bg-myntra-teal text-white border-myntra-teal' : 'bg-white border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setCompareProduct(null)
                setCompareSize(null)
              }}
              className="text-myntra-gray hover:text-myntra-dark"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <form onSubmit={runSearch} className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1.5 border border-gray-200">
              <Search size={12} className="text-myntra-gray" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search another ${product.category.toLowerCase()}…`}
                className="flex-1 text-xs outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="text-xs font-semibold bg-myntra-dark text-white px-2.5 py-1.5 rounded-full disabled:opacity-40"
            >
              Go
            </button>
          </form>
        )}

        {results.length > 0 && (
          <div className="mt-1.5 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-36 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => pickCompareProduct(r)}
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-myntra-bg flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {r.brand_name} {r.name}
                </span>
                <span className="text-myntra-gray shrink-0">{r.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* the comparison itself */}
      {outlines && (
        <div className="bg-white rounded-xl p-3 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-xs flex items-center gap-1.5">
              <Ruler size={13} className="text-myntra-pink" /> Fit preview
            </h3>
            <span className="text-[10px] text-myntra-gray">{bodySource.name}'s shape</span>
          </div>

          <div className="flex justify-center bg-myntra-bg rounded-lg py-2">
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-56" xmlns="http://www.w3.org/2000/svg">
              <g transform={`translate(${CENTER_X},0)`}>
                {visible.body && outlines.bodyOutline.path && (
                  <>
                    <circle
                      cx={outlines.bodyOutline.head.cx}
                      cy={outlines.bodyOutline.head.cy}
                      r={outlines.bodyOutline.head.r}
                      fill={LAYER_META.body.color}
                      fillOpacity={0.3}
                      stroke={LAYER_META.body.color}
                      strokeWidth={1.5}
                    />
                    <path
                      d={outlines.bodyOutline.path}
                      fill={LAYER_META.body.color}
                      fillOpacity={0.3}
                      stroke={LAYER_META.body.color}
                      strokeWidth={1.8}
                    />
                  </>
                )}
                {visible.compare && outlines.prevOutline.path && (
                  <path
                    d={outlines.prevOutline.path}
                    fill={LAYER_META.compare.color}
                    fillOpacity={0.16}
                    stroke={LAYER_META.compare.color}
                    strokeWidth={2}
                  />
                )}
                {visible.current && outlines.currOutline.path && (
                  <path
                    d={outlines.currOutline.path}
                    fill={LAYER_META.current.color}
                    fillOpacity={0.16}
                    stroke={LAYER_META.current.color}
                    strokeWidth={2}
                  />
                )}
              </g>
            </svg>
          </div>

          {/* layer legend / toggles */}
          <div className="flex flex-wrap gap-2 mt-2">
            {(['body', 'current', 'compare']).map((id) => {
              const disabled = id === 'current' ? !currentGarment : id === 'compare' ? !compareGarment : false
              return (
                <button
                  key={id}
                  disabled={disabled}
                  onClick={() => setVisible((v) => ({ ...v, [id]: !v[id] }))}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border disabled:opacity-30 ${
                    visible[id] ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 text-myntra-gray'
                  }`}
                >
                  {visible[id] ? <Eye size={11} color={LAYER_META[id].color} /> : <EyeOff size={11} />}
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: LAYER_META[id].color }} />
                  {id === 'current' ? currentGarment?.label || LAYER_META.current.label : id === 'compare' ? compareGarment?.label || LAYER_META.compare.label : LAYER_META.body.label}
                </button>
              )
            })}
          </div>

          {/* diff table */}
          <div className="mt-3">
            <div className="grid grid-cols-[54px_1fr_1fr_1fr] gap-1 pb-1 mb-1 border-b border-gray-200">
              <span></span>
              <span className="text-[9px] uppercase text-myntra-gray">Body</span>
              <span className="text-[9px] uppercase text-[#2E9E5B]">Compare</span>
              <span className="text-[9px] uppercase text-[#2563EB]">This item</span>
            </div>
            {outlines.rows.map((r) => {
              const compareEase = r.comparableToBody && has(r.bodyVal) && has(r.prevVal) ? r.prevVal - r.bodyVal : null
              const currentEase = r.comparableToBody && has(r.bodyVal) && has(r.currVal) ? r.currVal - r.bodyVal : null
              const compareClass = compareEase != null ? classifyEase(compareEase) : null
              const currentClass = currentEase != null ? classifyEase(currentEase) : null
              const cell = (v) => (has(v) ? `${v}` : '—')
              return (
                <div key={r.key} className="grid grid-cols-[54px_1fr_1fr_1fr] items-center gap-1 py-1 border-b border-gray-100 last:border-0">
                  <span className="text-[9.5px] uppercase text-myntra-gray">{r.label}</span>
                  <span className="text-[11px] font-mono">{cell(r.bodyVal)}</span>
                  <span className="text-[11px] font-mono" style={{ color: has(r.prevVal) ? '#2E9E5B' : '#B5B0A2' }}>
                    {cell(r.prevVal)}
                    {compareClass && (
                      <span className="ml-1 text-[8px] px-1 py-0.5 rounded" style={{ color: compareClass.fg, background: compareClass.bg }}>
                        {compareClass.label}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: has(r.currVal) ? '#2563EB' : '#B5B0A2' }}>
                    {cell(r.currVal)}
                    {currentClass && (
                      <span className="ml-1 text-[8px] px-1 py-0.5 rounded" style={{ color: currentClass.fg, background: currentClass.bg }}>
                        {currentClass.label}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-myntra-gray mt-2 flex items-start gap-1">
            <Info size={11} className="shrink-0 mt-0.5" /> Widths come from circumferences via a fixed
            front-view ratio — a visual sizing aid, not a tailoring spec.
          </p>
        </div>
      )}
    </div>
  )
}
