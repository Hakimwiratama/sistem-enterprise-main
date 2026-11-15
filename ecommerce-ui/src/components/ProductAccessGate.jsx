import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../context/useStore.js'

export default function ProductAccessGate({ children }) {
  const { accessToken, accessClaims, saveAccessToken } = useStore()
  const [draft, setDraft] = useState(accessToken)

  if (!accessToken || !accessClaims) {
    return (
      <section className="page-section manage-section">
        <div className="manage-access">
          <span className="section-kicker">AREA PENGELOLAAN</span>
          <h1>Masuk untuk mengelola produk.</h1>
          <p>Masukkan access token JWT dari layanan autentikasi Anda. Token harus memiliki claim <code>sub</code>, <code>role</code>, dan <code>exp</code>.</p>
          <form onSubmit={(event) => {
            event.preventDefault()
            saveAccessToken(draft)
          }}>
            <label>
              Access token
              <input
                type="password"
                autoComplete="off"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                required
              />
            </label>
            <button type="submit" className="button button-primary">Lanjutkan <span>↗</span></button>
          </form>
          {accessToken && <p className="form-error" role="alert">Token tidak valid atau sudah kedaluwarsa.</p>}
          <Link className="text-button" to="/">← Kembali ke katalog</Link>
        </div>
      </section>
    )
  }

  if (!['admin', 'seller'].includes(accessClaims.role)) {
    return (
      <section className="page-section manage-section">
        <div className="manage-access">
          <span className="section-kicker">AKSES DITOLAK</span>
          <h1>Akun pembeli tidak dapat mengelola produk.</h1>
          <p>Gunakan akun admin atau penjual yang memiliki izin.</p>
          <button type="button" className="text-button" onClick={() => saveAccessToken('')}>Keluar</button>
        </div>
      </section>
    )
  }

  return children
}
