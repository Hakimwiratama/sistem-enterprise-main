import { Link } from 'react-router-dom'
import ProductAccessGate from '../components/ProductAccessGate.jsx'
import useStore from '../context/useStore.js'
import { productApi } from '../api/productApi.js'
import { formatPrice, getImageSource } from '../utils/format.js'

function ProductManagementList() {
  const { accessClaims, accessToken, products, runAction, busyActions } = useStore()
  const isAdmin = accessClaims.role === 'admin'
  const ownedProducts = isAdmin
    ? products.data
    : products.data.filter((product) => String(product.seller_id ?? '') === accessClaims.sub)

  async function deleteProduct(product) {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return
    const result = await runAction(
      `delete-product-${product.id}`,
      () => productApi.delete(product.id, accessToken),
      'Produk berhasil dihapus.',
    )
    if (result) await products.reload()
  }

  return (
    <section className="page-section manage-section">
      <div className="manage-heading">
        <div>
          <span className="section-kicker">{isAdmin ? 'DASHBOARD ADMIN' : 'TOKO SAYA'}</span>
          <h1>Kelola <em>produk.</em></h1>
          <p>{isAdmin ? 'Lihat dan kelola produk seluruh penjual.' : 'Kelola produk yang Anda jual.'}</p>
        </div>
        <Link className="button button-primary" to="/manage/products/new">Tambah produk <span>＋</span></Link>
      </div>

      {products.error && (
        <div className="inline-alert" role="alert">
          Tidak dapat memuat produk. <button type="button" onClick={products.reload}>Coba lagi</button>
        </div>
      )}
      {products.loading ? (
        <div className="async-state" role="status">Memuat produk...</div>
      ) : ownedProducts.length ? (
        <div className="manage-product-list">
          {ownedProducts.map((product) => (
            <article className="manage-product" key={product.id}>
              <div className="manage-product-image">
                {getImageSource(product.image)
                  ? <img src={getImageSource(product.image)} alt="" />
                  : <span aria-hidden="true">✳</span>}
              </div>
              <div className="manage-product-info">
                <span className="manage-category">{product.category || 'Umum'}</span>
                <h2>{product.name}</h2>
                <p>{product.description || 'Tidak ada deskripsi.'}</p>
                <div className="manage-product-meta">
                  <strong>{formatPrice(product.price)}</strong>
                  <span>{product.stock} stok</span>
                  {isAdmin && <span>Penjual: {product.seller_id || 'Data lama'}</span>}
                </div>
              </div>
              <div className="manage-product-actions">
                <Link className="button button-outline" to={`/manage/products/${product.id}/edit`}>Edit</Link>
                <button
                  type="button"
                  className="button button-danger"
                  disabled={Boolean(busyActions[`delete-product-${product.id}`])}
                  onClick={() => deleteProduct(product)}
                >
                  {busyActions[`delete-product-${product.id}`] ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state product-empty">
          <span className="empty-icon">✳</span>
          <h3>Belum ada produk yang dikelola</h3>
          <p>Tambahkan produk pertama beserta foto untuk mulai mengisi katalog.</p>
        </div>
      )}
    </section>
  )
}

export default function ProductManagementPage() {
  return <ProductAccessGate><ProductManagementList /></ProductAccessGate>
}
