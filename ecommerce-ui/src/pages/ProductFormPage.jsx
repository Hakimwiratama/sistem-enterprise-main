import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productApi } from '../api/productApi.js'
import AsyncView from '../components/AsyncView.jsx'
import ProductAccessGate from '../components/ProductAccessGate.jsx'
import useStore from '../context/useStore.js'
import useAsync from '../hooks/useAsync.js'
import { getImageSource } from '../utils/format.js'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function ProductForm() {
  const { productId } = useParams()
  const isEditing = Boolean(productId)
  const loadProduct = useCallback(
    () => (isEditing ? productApi.get(productId) : Promise.resolve(null)),
    [isEditing, productId],
  )
  const currentProduct = useAsync(loadProduct, {
    key: isEditing ? `manage-product-${productId}` : 'new-product',
    initialData: null,
  })
  const { accessToken, accessClaims, products, runAction, busyActions } = useStore()
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const previewUrlRef = useRef('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function setLocalPreview(file) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = file ? URL.createObjectURL(file) : ''
    setPreviewUrl(previewUrlRef.current)
  }

  function chooseImage(event) {
    const file = event.target.files?.[0]
    if (!file) {
      setLocalPreview(null)
      setSelectedFile(null)
      setFileError('')
      return
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError('Format foto harus JPG, JPEG, PNG, atau WEBP.')
      event.target.value = ''
      setLocalPreview(null)
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFileError('Ukuran foto maksimal 5 MB.')
      event.target.value = ''
      setLocalPreview(null)
      setSelectedFile(null)
      return
    }
    setFileError('')
    setLocalPreview(file)
    setSelectedFile(file)
  }

  async function submitProduct(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const payload = new FormData()
    for (const field of ['name', 'description', 'price', 'stock', 'category']) {
      payload.append(field, fields.get(field))
    }
    if (selectedFile) payload.append('image', selectedFile)

    const result = await runAction(
      isEditing ? `update-product-${productId}` : 'create-product',
      () => isEditing
        ? productApi.update(productId, payload, accessToken)
        : productApi.create(payload, accessToken),
      isEditing ? 'Produk berhasil diperbarui.' : 'Produk dan foto berhasil ditambahkan.',
    )
    if (result) {
      await products.reload()
      navigate('/manage/products')
    }
  }

  const formContent = (
    <>
      <Link className="text-button back-link" to="/manage/products">← Kembali ke pengelolaan</Link>
      {isEditing && accessClaims?.role === 'seller'
        && String(currentProduct.data?.seller_id ?? '') !== accessClaims.sub
        ? (
          <div className="inline-alert" role="alert">
            Anda hanya dapat mengubah produk milik sendiri.
          </div>
        ) : (
        <>
          <div className="manage-heading form-heading">
        <div>
          <span className="section-kicker">{isEditing ? 'PERBARUI KATALOG' : 'PRODUK BARU'}</span>
          <h1>{isEditing ? 'Edit produk.' : 'Tambah produk.'}</h1>
          <p>Lengkapi informasi produk dan unggah foto JPG, PNG, atau WEBP (maksimal 5 MB).</p>
        </div>
      </div>

      <form className="product-form" onSubmit={submitProduct}>
        <div className="product-form-fields">
          <label>
            Nama produk
            <input name="name" required maxLength={150} defaultValue={currentProduct.data?.name ?? ''} />
          </label>
          <label>
            Kategori
            <input name="category" required maxLength={100} defaultValue={currentProduct.data?.category ?? ''} placeholder="Contoh: Aksesori" />
          </label>
          <label className="form-field-wide">
            Deskripsi produk
            <textarea name="description" rows="5" defaultValue={currentProduct.data?.description ?? ''} />
          </label>
          <label>
            Harga (Rp)
            <input name="price" type="number" min="0" step="0.01" required defaultValue={currentProduct.data?.price ?? ''} />
          </label>
          <label>
            Stok
            <input name="stock" type="number" min="0" step="1" required defaultValue={currentProduct.data?.stock ?? ''} />
          </label>

          <label className="form-field-wide">
            Foto produk {isEditing && <span className="field-note">Pilih foto baru untuk mengganti foto saat ini.</span>}
            <input
              ref={fileInput}
              type="file"
              name="image"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              required={!isEditing}
              onChange={chooseImage}
            />
            {fileError && <span className="form-error" role="alert">{fileError}</span>}
          </label>

          {(previewUrl || currentProduct.data?.image) && (
            <div className="product-form-preview">
              <span className="field-note">{selectedFile ? 'Preview foto baru' : 'Foto tersimpan'}</span>
              <img src={previewUrl || getImageSource(currentProduct.data.image)} alt="Preview foto produk" />
              {selectedFile && (
                <button type="button" className="text-button" onClick={() => {
                  setSelectedFile(null)
                  setLocalPreview(null)
                  if (fileInput.current) fileInput.current.value = ''
                }}>Batal mengganti foto</button>
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <Link className="button button-outline" to="/manage/products">Batal</Link>
          <button
            type="submit"
            className="button button-primary"
            disabled={Boolean(busyActions[isEditing ? `update-product-${productId}` : 'create-product'])}
          >
            {busyActions[isEditing ? `update-product-${productId}` : 'create-product']
              ? 'Menyimpan...'
              : isEditing ? 'Simpan perubahan' : 'Simpan produk'}
            <span>↗</span>
          </button>
        </div>
          </form>
        </>
        )}
    </>
  )

  return (
    <ProductAccessGate>
      <section className="page-section manage-section">
        {isEditing ? (
          <AsyncView
            loading={currentProduct.loading}
            error={currentProduct.error}
            onRetry={currentProduct.reload}
            label="produk"
          >
            {currentProduct.data && formContent}
          </AsyncView>
        ) : formContent}
      </section>
    </ProductAccessGate>
  )
}

export default function ProductFormPage() {
  return <ProductForm />
}
