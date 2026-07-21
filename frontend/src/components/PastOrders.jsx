import React from 'react'
import { Package } from 'lucide-react'

export default function PastOrders({ orders = [], mostOrderedSize }) {
  if (orders.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Package size={18} className="text-myntra-pink" />
        <h3 className="font-semibold">Recent orders for this item</h3>
      </div>
      {mostOrderedSize && (
        <p className="text-sm text-myntra-gray mb-3">
          Most buyers picked size <span className="font-semibold text-myntra-dark">{mostOrderedSize}</span> —
          ask the AI stylist if that's likely right for you.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {orders.slice(0, 6).map((o) => (
          <div key={o.id} className="bg-myntra-bg rounded-lg px-3 py-2 text-xs flex justify-between">
            <span className="text-myntra-dark font-medium">Size {o.size_ordered}</span>
            <span
              className={
                o.status === 'Delivered'
                  ? 'text-myntra-teal'
                  : o.status === 'Exchanged'
                  ? 'text-myntra-orange'
                  : 'text-red-400'
              }
            >
              {o.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
