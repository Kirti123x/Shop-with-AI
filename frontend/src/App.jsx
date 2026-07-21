import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { MeasurementsProvider } from './MeasurementsContext.jsx'
import { ProfilesProvider } from './ProfilesContext.jsx'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import ProductPage from './pages/ProductPage.jsx'
import ChatWidget from './components/Chatbot/ChatWidget.jsx'

export default function App() {
  const [activeProduct, setActiveProduct] = React.useState(null)

  return (
    <MeasurementsProvider>
      <ProfilesProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/product/:id"
                element={<ProductPage onProductLoaded={setActiveProduct} />}
              />
            </Routes>
          </main>
          <footer className="bg-myntra-dark text-white/70 text-sm py-8 text-center mt-16">
            StyleHub — built for demo purposes. All prices in ₹.
          </footer>
          <ChatWidget activeProduct={activeProduct} />
        </div>
      </ProfilesProvider>
    </MeasurementsProvider>
  )
}
