import React from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-card">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display font-extrabold text-2xl text-myntra-pink tracking-tight">Style</span>
            <span className="font-display font-extrabold text-2xl text-myntra-dark tracking-tight">Hub</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl items-center bg-myntra-bg rounded-full px-4 py-2 gap-2">
            <Search size={18} className="text-myntra-gray" />
            <input
              placeholder="Search for T-shirts, jeans, dresses, sneakers…"
              className="bg-transparent outline-none text-sm w-full placeholder:text-myntra-gray"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
