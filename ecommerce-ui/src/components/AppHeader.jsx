import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

const USER_OPTIONS = [1, 2, 3, 4, 5]

export default function AppHeader({ cartQuantity, userId, onUserChange }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const search = searchParams.get('q') ?? ''

  function updateSearch(value) {
    const nextParams = new URLSearchParams(searchParams)
    if (value.trim()) nextParams.set('q', value)
    else nextParams.delete('q')

    if (location.pathname !== '/') {
      navigate({ pathname: '/', search: nextParams.toString() }, { replace: true })
      return
    }

    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <div className="announcement">
        <span className="announcement-dot" />
        Pilihan baik untuk hari-hari yang lebih menyenangkan
      </div>

      <header className="site-header">
        <Link className="brand" to="/" aria-label="Kembali ke beranda">
          <span className="brand-mark">s</span>
          <span>serambi<span className="brand-period">.</span></span>
        </Link>

        <label className="search-box">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Cari produk favoritmu..."
            aria-label="Cari produk"
          />
          <kbd>⌘ K</kbd>
        </label>

        <nav className="main-nav" aria-label="Navigasi utama">
          <NavLink className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`} to="/">
            Belanja
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`} to="/orders">
            Pesanan
          </NavLink>
          <NavLink
            className={({ isActive }) => `cart-link ${isActive ? 'is-active' : ''}`}
            to="/cart"
            aria-label={`Buka keranjang, ${cartQuantity} item`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            <span>Keranjang</span>
            {cartQuantity > 0 && <span className="cart-count">{cartQuantity}</span>}
          </NavLink>
          <label className="user-chip" title="Mode demo tanpa autentikasi">
            <span className="user-avatar">S</span>
            <span>Pengguna</span>
            <select
              aria-label="Pilih pengguna demo"
              value={userId}
              onChange={(event) => onUserChange(event.target.value)}
            >
              {USER_OPTIONS.map((id) => <option value={id} key={id}>{id}</option>)}
            </select>
          </label>
        </nav>
      </header>
    </>
  )
}
