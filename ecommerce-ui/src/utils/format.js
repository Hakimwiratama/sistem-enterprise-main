const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? rupiahFormatter.format(amount) : 'Harga tidak tersedia'
}

export function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatError(error) {
  if (!error || typeof error.message !== 'string') {
    return 'Terjadi kesalahan yang tidak diketahui.'
  }

  const details = error.errors
  if (Array.isArray(details)) {
    return [error.message, ...details].join(' ')
  }
  if (details && typeof details === 'object') {
    const messages = Object.values(details)
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value) => typeof value === 'string')
    return messages.length ? `${error.message} ${messages.join(' ')}` : error.message
  }
  return error.message
}

export function getImageSource(image) {
  if (typeof image !== 'string' || image.trim() === '') return ''
  if (image.startsWith('data:image/')) return image
  const mimeType = image.startsWith('iVBOR') ? 'image/png' : 'image/jpeg'
  return `data:${mimeType};base64,${image}`
}
