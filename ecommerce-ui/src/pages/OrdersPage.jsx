import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AsyncView from '../components/AsyncView.jsx'
import useStore from '../context/useStore.js'
import { formatDate, formatPrice } from '../utils/format.js'

export default function OrdersPage() {
  const location = useLocation()
  const [expandedOrderId, setExpandedOrderId] = useState(
    location.state?.createdOrderId ?? null,
  )
  const [orderDetails, setOrderDetails] = useState({})
  const { orders, runAction, busyActions } = useStore()

  async function showDetails(order) {
    if (expandedOrderId === Number(order.id)) {
      setExpandedOrderId(null)
      return
    }
    setExpandedOrderId(Number(order.id))
    if (orderDetails[order.id]) return

    const detail = await runAction(
      `detail-${order.id}`,
      () => orders.get(order.id),
      null,
    )
    if (detail) setOrderDetails((current) => ({ ...current, [order.id]: detail }))
  }

  async function updateStatus(order, action) {
    const isPayment = action === 'pay'
    await runAction(
      `${action}-${order.id}`,
      async () => {
        const result = isPayment
          ? await orders.pay(order.id)
          : await orders.cancel(order.id)
        await orders.reload()
        return result
      },
      isPayment ? 'Pembayaran berhasil dicatat.' : 'Pesanan berhasil dibatalkan.',
    )
  }

  return (
    <section className="page-section">
      <div className="page-title">
        <div>
          <span className="section-kicker">SEMUA PILIHANMU, TERSIMPAN</span>
          <h1>Pesanan <em>kamu.</em></h1>
        </div>
        <button type="button" className="button button-outline" onClick={orders.reload}>
          Muat ulang
        </button>
      </div>
      <AsyncView
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.reload}
        label="pesanan"
      >
        {orders.data.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">↗</span>
            <h3>Belum ada pesanan</h3>
            <p>Pesanan yang sudah kamu buat akan tersimpan di sini.</p>
            <Link className="button button-primary" to="/">Jelajahi produk <span>↗</span></Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.data.map((order) => {
              const detail = orderDetails[order.id] ?? order
              const isExpanded = expandedOrderId === Number(order.id)
              return (
                <article className={`order-card ${isExpanded ? 'is-expanded' : ''}`} key={order.id}>
                  <div className="order-topline">
                    <div>
                      <span className="order-label">PESANAN #{order.id}</span>
                      <span className="order-date">{formatDate(order.created_at)}</span>
                    </div>
                    <span className={`status-pill status-${String(order.status).toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="order-overview">
                    <div className="order-products-preview">
                      {(order.items ?? []).slice(0, 3).map((item) => (
                        <span key={item.product_id}>{item.product_name}</span>
                      ))}
                      {(order.items ?? []).length > 3 && (
                        <span>+{order.items.length - 3} lainnya</span>
                      )}
                    </div>
                    <div className="order-total">
                      <span>Total pesanan</span><strong>{formatPrice(order.total_amount)}</strong>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="order-detail">
                      {(detail.items ?? []).map((item) => (
                        <div className="order-line" key={item.product_id}>
                          <span>{item.product_name} <small>× {item.quantity}</small></span>
                          <span>{formatPrice(item.subtotal)}</span>
                        </div>
                      ))}
                      <div className="order-line order-final-total">
                        <strong>Total</strong><strong>{formatPrice(detail.total_amount)}</strong>
                      </div>
                    </div>
                  )}
                  <div className="order-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={Boolean(busyActions[`detail-${order.id}`])}
                      onClick={() => showDetails(order)}
                    >
                      {busyActions[`detail-${order.id}`]
                        ? 'Memuat...'
                        : isExpanded ? 'Tutup detail' : 'Lihat detail'}
                    </button>
                    {order.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={Boolean(busyActions[`cancel-${order.id}`])}
                          onClick={() => updateStatus(order, 'cancel')}
                        >Batalkan</button>
                        <button
                          type="button"
                          className="button button-primary"
                          disabled={Boolean(busyActions[`pay-${order.id}`])}
                          onClick={() => updateStatus(order, 'pay')}
                        >
                          {busyActions[`pay-${order.id}`] ? 'Memproses...' : 'Bayar sekarang'}
                          <span>↗</span>
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </AsyncView>
    </section>
  )
}
