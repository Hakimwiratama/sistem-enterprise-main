import { Link } from 'react-router-dom'
import { formatPrice, getImageSource } from '../utils/format.js'

export default function ProductCard({ product, index = 0, quantityInCart = 0, busy, onAdd }) {
  const stock = Number(product.stock)
  const canAdd = stock > quantityInCart
  const image = getImageSource(product.image)

  return (
    <article className="product-card">
      <Link
        className={`product-image image-tone-${index % 4}`}
        to={`/products/${product.id}`}
        aria-label={`Lihat detail ${product.name}`}
      >
        {image
          ? <img src={image} alt={product.name} />
          : <span className="image-placeholder" aria-hidden="true">{['✳', '◌', '❋', '✿'][index % 4]}</span>}
        {stock > 0 && stock <= 5 && <span className="product-badge">Stok terbatas</span>}
        {stock === 0 && <span className="product-badge sold-out">Habis</span>}
        <span className="product-open" aria-hidden="true">↗</span>
      </Link>
      <div className="product-info">
        <Link className="product-name" to={`/products/${product.id}`}>{product.name}</Link>
        <p className="product-description">
          {product.description || 'Teman baik untuk kebutuhan sehari-hari.'}
        </p>
        <div className="product-meta">
          <strong>{formatPrice(product.price)}</strong>
          <span>{stock > 0 ? `${stock} tersedia` : 'Stok habis'}</span>
        </div>
        <button
          type="button"
          className="add-button"
          disabled={!canAdd || busy}
          onClick={() => onAdd(product)}
        >
          {busy ? 'Menambahkan...' : canAdd ? 'Tambah ke keranjang' : 'Stok tidak tersedia'}
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </article>
  )
}
