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
  // Lifted here (rather than kept inside ChatWidget) so the page content
  // column can actually shrink to 60% width when the chat panel is docked
  // open, instead of the panel floating over the content.
  const [chatOpen, setChatOpen] = React.useState(false)

  return (
    <MeasurementsProvider>
      <ProfilesProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-stretch">
            <main
              className="min-w-0 flex-1 transition-[width] duration-300 ease-in-out"
              style={{ width: chatOpen ? '60%' : '100%' }}
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/product/:id"
                  element={<ProductPage onProductLoaded={setActiveProduct} />}
                />
              </Routes>
              <footer className="bg-myntra-dark text-white/70 text-sm py-8 text-center mt-16">
                StyleHub — built for demo purposes. All prices in ₹.
              </footer>
            </main>
          </div>
          <ChatWidget
            activeProduct={activeProduct}
            open={chatOpen}
            onToggle={() => setChatOpen((v) => !v)}
          />
        </div>
      </ProfilesProvider>
    </MeasurementsProvider>
  )
}
