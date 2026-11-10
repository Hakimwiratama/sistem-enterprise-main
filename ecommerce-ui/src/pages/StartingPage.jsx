import { Link } from 'react-router-dom'

export default function StartingPage() {
  return (
    <section className="empty-state starting-page">
      <span className="empty-icon">✳</span>
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat ini belum tersedia. Kembali ke katalog untuk menemukan barang pilihan.</p>
      <Link className="button button-primary" to="/">Kembali ke beranda <span>↗</span></Link>
    </section>
  )
}
