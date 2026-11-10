import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import AppHeader from './components/AppHeader.jsx'
import StoreProvider from './context/StoreProvider.jsx'
import useStore from './context/useStore.js'
import CartPage from './pages/CartPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import ProductDetailPage from './pages/ProductDetailPage.jsx'
import ProductListPage from './pages/ProductListPage.jsx'
import StartingPage from './pages/StartingPage.jsx'

function Toast() {
  const { notice, setNotice } = useStore()
  if (!notice) return null

  return (
    <div className={`toast toast-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <span>{notice.tone === 'success' ? '✓' : '!'}</span>
      {notice.message}
      <button type="button" aria-label="Tutup notifikasi" onClick={() => setNotice(null)}>×</button>
    </div>
  )
}

function Storefront() {
  const {
    cartQuantity,
    userId,
    changeUserId,
    notice,
    setNotice,
  } = useStore()

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  return (
    <div className="app-shell">
      <AppHeader
        cartQuantity={cartQuantity}
        userId={userId}
        onUserChange={changeUserId}
      />
      <main>
        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*" element={<StartingPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark">s</span>
          <span>serambi<span className="brand-period">.</span></span>
        </Link>
        <p>Menemukan hal baik, untuk keseharian yang lebih berarti.</p>
        <span className="footer-copy">© 2026 Serambi. Dibuat dengan hati <b>♡</b></span>
      </footer>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Storefront />
    </StoreProvider>
  )
}
