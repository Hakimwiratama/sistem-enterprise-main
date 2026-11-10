import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AsyncView from '../components/AsyncView.jsx'
import ProductCard from '../components/ProductCard.jsx'
import useStore from '../context/useStore.js'

const FILTERS = [
  { id: 'all', label: 'Semua produk' },
  { id: 'available', label: 'Siap dikirim' },
  { id: 'low-stock', label: 'Stok terbatas' },
]

export default function ProductListPage() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [searchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const { products, cart, runAction, busyActions } = useStore()

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    return products.data
      .filter((product) => {
        const matchesSearch = !query
          || `${product.name} ${product.description ?? ''}`
            .toLocaleLowerCase('id-ID')
            .includes(query)
        const stock = Number(product.stock)
        const matchesFilter = filter === 'all'
          || (filter === 'available' && stock > 0)
          || (filter === 'low-stock' && stock > 0 && stock <= 5)
        return matchesSearch && matchesFilter
      })
      .sort((first, second) => {
        if (sort === 'price-low') return Number(first.price) - Number(second.price)
        if (sort === 'price-high') return Number(second.price) - Number(first.price)
        return new Date(second.created_at ?? 0) - new Date(first.created_at ?? 0)
      })
  }, [filter, products.data, search, sort])

  async function addToCart(product) {
    const quantityInCart = cart.data.items
      .filter((item) => Number(item.product_id) === Number(product.id))
      .reduce((total, item) => total + Number(item.quantity), 0)
    if (quantityInCart >= Number(product.stock)) {
      return runAction('stock-limit', async () => {
        throw new Error('Jumlah di keranjang sudah mencapai stok produk.')
      })
    }

    return runAction(
      `add-${product.id}`,
      () => cart.add(product.id),
      `${product.name} ditambahkan ke keranjang.`,
    )
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span /> PILIHAN HARI INI</span>
          <h1>Hal kecil yang bikin<br />hari terasa <em>lebih baik.</em></h1>
          <p>Temukan barang pilihan untuk menemani setiap sudut hidupmu.</p>
          <button
            type="button"
            className="button button-light"
            onClick={() => document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Jelajahi koleksi <span aria-hidden="true">↘</span>
          </button>
          <div className="hero-note">
            <span className="hero-note-mark">✳</span>
            <span>Dikurasi dengan hati<br /><strong>untuk sehari-hari.</strong></span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-product">
            <div className="art-product-top" />
            <div className="art-product-body"><span>everyday<br />essentials</span></div>
            <div className="art-product-handle" />
          </div>
          <div className="art-flower flower-one">✳</div>
          <div className="art-flower flower-two">✿</div>
          <div className="art-caption">benda baik,<br />hari baik.</div>
          <div className="art-sticker">01<br /><span>serambi</span></div>
        </div>
        <div className="hero-index">01 <span>/</span> 03</div>
      </section>

      <section className="promise-row" aria-label="Keunggulan toko">
        <div className="promise-item">
          <span className="promise-icon">✳</span>
          <span><strong>Pilihan berkualitas</strong><small>Barang yang kami percaya</small></span>
        </div>
        <div className="promise-item">
          <span className="promise-icon">↗</span>
          <span><strong>Belanja tanpa ribet</strong><small>Proses mudah, cepat, aman</small></span>
        </div>
        <div className="promise-item">
          <span className="promise-icon">♡</span>
          <span><strong>Dari kami untukmu</strong><small>Layanan dengan sepenuh hati</small></span>
        </div>
      </section>

      <section className="catalog-section" id="katalog">
        <div className="section-heading">
          <div>
            <span className="section-kicker">TEMUKAN YANG KAMU SUKA</span>
            <h2>Barang baik, <em>pilihanmu.</em></h2>
          </div>
          <p>Temukan pilihan untuk hari-hari<br />yang lebih menyenangkan.</p>
        </div>

        <div className="catalog-toolbar">
          <div className="filter-list" role="group" aria-label="Filter produk">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`filter-chip ${filter === item.id ? 'is-selected' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="sort-control">
            <span>Urutkan</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Terbaru</option>
              <option value="price-low">Harga terendah</option>
              <option value="price-high">Harga tertinggi</option>
            </select>
          </label>
        </div>

        <AsyncView
          loading={products.loading}
          error={products.error}
          onRetry={products.reload}
          label="katalog"
        >
          {visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.map((product, index) => {
                const quantityInCart = cart.data.items
                  .filter((item) => Number(item.product_id) === Number(product.id))
                  .reduce((total, item) => total + Number(item.quantity), 0)
                return (
                  <ProductCard
                    product={product}
                    index={index}
                    quantityInCart={quantityInCart}
                    busy={Boolean(busyActions[`add-${product.id}`])}
                    onAdd={addToCart}
                    key={product.id}
                  />
                )
              })}
            </div>
          ) : (
            <div className="empty-state product-empty">
              <span className="empty-icon">⌕</span>
              <h3>{search ? 'Produk belum ditemukan' : 'Belum ada produk'}</h3>
              <p>{search
                ? 'Coba kata kunci lain untuk menemukan yang kamu cari.'
                : 'Produk akan muncul di sini setelah katalog tersedia.'}
              </p>
            </div>
          )}
        </AsyncView>

        <div className="catalog-footnote">
          <span>MENAMPILKAN {visibleProducts.length} DARI {products.data.length} PRODUK</span>
          <span>SELALU ADA YANG BARU <b>✳</b></span>
        </div>
      </section>
    </>
  )
}
