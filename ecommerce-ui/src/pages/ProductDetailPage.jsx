import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import AsyncView from '../components/AsyncView.jsx'
import ReviewForm from '../components/ReviewForm.jsx'
import StarRating from '../components/StarRating.jsx'
import { productApi } from '../api/productApi.js'
import useStore from '../context/useStore.js'
import useAsync from '../hooks/useAsync.js'
import useReviews from '../hooks/useReviews.js'
import { formatDate, formatPrice, getImageSource } from '../utils/format.js'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const loadProduct = useCallback(() => productApi.get(productId), [productId])
  const product = useAsync(loadProduct, { key: `product-${productId}`, initialData: null })
  const reviews = useReviews(productId)
  const { userId, cart, runAction, busyActions } = useStore()

  async function addToCart(currentProduct) {
    const quantityInCart = cart.data.items
      .filter((item) => Number(item.product_id) === Number(currentProduct.id))
      .reduce((total, item) => total + Number(item.quantity), 0)
    if (quantityInCart >= Number(currentProduct.stock)) {
      return runAction('stock-limit', async () => {
        throw new Error('Jumlah di keranjang sudah mencapai stok produk.')
      })
    }
    return runAction(
      `add-${currentProduct.id}`,
      () => cart.add(currentProduct.id),
      `${currentProduct.name} ditambahkan ke keranjang.`,
    )
  }

  async function submitReview(rating, comment) {
    return runAction(
      `review-${productId}`,
      () => reviews.create(userId, rating, comment),
      'Terima kasih, ulasan Anda berhasil dikirim.',
    )
  }

  return (
    <section className="page-section">
      <Link className="text-button back-link" to="/">← Kembali ke katalog</Link>
      <AsyncView
        loading={product.loading}
        error={product.error}
        onRetry={product.reload}
        label="detail produk"
      >
        {product.data && (
          <>
            <article className="product-detail-layout">
              <div className="detail-image">
                {getImageSource(product.data.image)
                  ? <img src={getImageSource(product.data.image)} alt={product.data.name} />
                  : <span aria-hidden="true">✳</span>}
              </div>
              <div className="detail-copy">
                <span className="section-kicker">PILIHAN SERAMBI</span>
                <h1>{product.data.name}</h1>
                <strong className="detail-price">{formatPrice(product.data.price)}</strong>
                <p>{product.data.description || 'Barang pilihan untuk menemani kebutuhan sehari-hari.'}</p>
                <StarRating
                  rating={reviews.data.summary.average_rating}
                  total={reviews.data.summary.total_reviews}
                  showTotal
                />
                <span className="stock-note">
                  {Number(product.data.stock) > 0
                    ? `${product.data.stock} item tersedia`
                    : 'Stok sedang habis'}
                </span>
                <button
                  type="button"
                  className="button button-primary detail-add"
                  disabled={
                    Number(product.data.stock) <= 0
                    || Boolean(busyActions[`add-${product.data.id}`])
                  }
                  onClick={() => addToCart(product.data)}
                >
                  {busyActions[`add-${product.data.id}`] ? 'Menambahkan...' : 'Tambah ke keranjang'}
                  <span>↗</span>
                </button>
              </div>
            </article>

            <section className="detail-reviews">
              <div className="review-heading">
                <div>
                  <span className="section-kicker">CERITA DARI PEMBELI</span>
                  <h2>Ulasan pilihan.</h2>
                </div>
                <span>{reviews.data.summary.total_reviews} ulasan</span>
              </div>
              <AsyncView
                loading={reviews.loading}
                error={reviews.error}
                onRetry={reviews.reload}
                label="ulasan"
              >
                {reviews.data.reviews.length ? (
                  <div className="review-list">
                    {reviews.data.reviews.map((review) => (
                      <article className="review-item" key={review.id}>
                        <div className="review-item-top">
                          <strong>Pengguna {review.user_id}</strong>
                          <StarRating rating={review.rating} />
                        </div>
                        <p>{review.comment || 'Pembeli belum menambahkan komentar.'}</p>
                        <small>{formatDate(review.created_at)}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="review-message">Belum ada ulasan. Jadilah yang pertama berbagi cerita.</p>
                )}
              </AsyncView>
              <ReviewForm
                onSubmit={submitReview}
                disabled={Boolean(busyActions[`review-${productId}`])}
              />
            </section>
          </>
        )}
      </AsyncView>
    </section>
  )
}
