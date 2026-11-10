import { Link, useNavigate } from 'react-router-dom'
import AsyncView from '../components/AsyncView.jsx'
import useStore from '../context/useStore.js'
import { formatPrice, getImageSource } from '../utils/format.js'

export default function CartPage() {
  const navigate = useNavigate()
  const {
    cart,
    cartQuantity,
    cartTotal,
    orders,
    productById,
    runAction,
    busyActions,
  } = useStore()

  async function updateQuantity(item, quantity) {
    const product = productById.get(Number(item.product_id))
    if (quantity < 1) return
    if (product && quantity > Number(product.stock)) {
      return runAction('stock-limit', async () => {
        throw new Error(`Stok ${product.name} yang tersedia ${product.stock} item.`)
      })
    }
    return runAction(
      `cart-${item.id}`,
      () => cart.update(item.id, quantity),
      'Jumlah produk di keranjang diperbarui.',
    )
  }

  async function removeItem(item) {
    return runAction(
      `remove-${item.id}`,
      () => cart.remove(item.id),
      'Produk dihapus dari keranjang.',
    )
  }

  async function checkout() {
    const order = await runAction(
      'checkout',
      async () => {
        const createdOrder = await orders.checkout()
        await cart.reload()
        navigate('/orders', { state: { createdOrderId: createdOrder.id } })
        return createdOrder
      },
      'Pesanan berhasil dibuat. Silakan lanjutkan pembayaran.',
    )
    return order
  }

  return (
    <section className="page-section">
      <div className="page-title">
        <div>
          <span className="section-kicker">SEBELUM JADI MILIKMU</span>
          <h1>Keranjang <em>belanja.</em></h1>
        </div>
        <p>{cartQuantity} barang pilihanmu</p>
      </div>
      <AsyncView
        loading={cart.loading}
        error={cart.error}
        onRetry={cart.reload}
        label="keranjang"
      >
        {cart.data.items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">♡</span>
            <h3>Keranjangmu masih kosong</h3>
            <p>Yuk, temukan sesuatu yang bikin harimu lebih baik.</p>
            <Link className="button button-primary" to="/">Mulai belanja <span>↗</span></Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cart.data.items.map((item) => {
                const product = productById.get(Number(item.product_id))
                return (
                  <article className="cart-item" key={item.id}>
                    <div className="cart-item-image">
                      {product && getImageSource(product.image)
                        ? <img src={getImageSource(product.image)} alt="" />
                        : <span aria-hidden="true">✳</span>}
                    </div>
                    <div className="cart-item-info">
                      <strong>{product?.name ?? `Produk #${item.product_id}`}</strong>
                      <span>{product ? formatPrice(product.price) : 'Harga tidak tersedia'}</span>
                      <button
                        type="button"
                        className="text-button remove-button"
                        disabled={Boolean(busyActions[`remove-${item.id}`])}
                        onClick={() => removeItem(item)}
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="quantity-control" aria-label={`Jumlah ${product?.name ?? 'produk'}`}>
                      <button
                        type="button"
                        aria-label="Kurangi jumlah"
                        disabled={Number(item.quantity) <= 1 || Boolean(busyActions[`cart-${item.id}`])}
                        onClick={() => updateQuantity(item, Number(item.quantity) - 1)}
                      >−</button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Tambah jumlah"
                        disabled={
                          Boolean(busyActions[`cart-${item.id}`])
                          || (product && Number(item.quantity) >= Number(product.stock))
                        }
                        onClick={() => updateQuantity(item, Number(item.quantity) + 1)}
                      >+</button>
                    </div>
                    <strong className="cart-item-subtotal">
                      {product ? formatPrice(Number(product.price) * Number(item.quantity)) : '—'}
                    </strong>
                  </article>
                )
              })}
            </div>
            <aside className="summary-card">
              <span className="section-kicker">RINGKASAN PESANAN</span>
              <h2>Hampir jadi milikmu.</h2>
              <div className="summary-row"><span>Total barang</span><span>{cartQuantity} item</span></div>
              <div className="summary-row"><span>Pengiriman</span><span className="free-shipping">Belum dihitung</span></div>
              <div className="summary-total"><span>Subtotal</span><strong>{formatPrice(cartTotal)}</strong></div>
              <p className="summary-note">Total ini hanya mencakup harga produk. Biaya kirim belum termasuk.</p>
              <button
                className="button button-primary checkout-button"
                type="button"
                disabled={
                  Boolean(busyActions.checkout)
                  || cart.data.items.some((item) => !productById.has(Number(item.product_id)))
                }
                onClick={checkout}
              >
                {busyActions.checkout ? 'Memproses...' : 'Lanjut ke checkout'}
                <span aria-hidden="true">↗</span>
              </button>
            </aside>
          </div>
        )}
      </AsyncView>
    </section>
  )
}
