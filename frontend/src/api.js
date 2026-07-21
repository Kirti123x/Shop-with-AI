const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch (_) {}
    throw new Error(detail)
  }
  return res.json()
}

export const api = {
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
    return request(`/products?${qs.toString()}`)
  },
  getProduct: (id) => request(`/products/${id}`),
  getFilters: () => request(`/products/meta/filters`),

  sendChat: (payload) =>
    request(`/chat`, { method: 'POST', body: JSON.stringify(payload) }),
  getLanguages: () => request(`/chat/languages`),
  getSuggestions: (productId) =>
    request(`/chat/suggestions${productId ? `?product_id=${productId}` : ''}`),

  getMeasurementBounds: () => request(`/measurements/bounds`),
  estimateMeasurements: (frontImageBase64, sideImageBase64, heightCm) =>
    request(`/measurements/estimate`, {
      method: 'POST',
      body: JSON.stringify({
        front_image_base64: frontImageBase64,
        side_image_base64: sideImageBase64,
        height_cm: heightCm,
      }),
    }),
}
