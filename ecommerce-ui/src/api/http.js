const TIMEOUT_MS = 5000

export class ApiError extends Error {
  constructor(message, { status = 0, errors = [] } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export const services = {
  product: import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:3000',
  cart: import.meta.env.VITE_CART_API_URL || 'http://localhost:3001',
  review: import.meta.env.VITE_REVIEW_API_URL || 'http://localhost:3002',
  order: import.meta.env.VITE_ORDER_API_URL || 'http://localhost:3003',
}

export async function request(baseUrl, path, { method = 'GET', body } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const url = `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const responseText = await response.text()
    let payload = null
    if (responseText) {
      try {
        payload = JSON.parse(responseText)
      } catch {
        if (response.ok) {
          throw new ApiError('Server mengirim respons yang tidak valid.', {
            status: response.status,
          })
        }
      }
    }

    if (!response.ok) {
      throw new ApiError(payload?.message ?? `Permintaan gagal (${response.status})`, {
        status: response.status,
        errors: payload?.errors ?? null,
      })
    }

    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error?.name === 'AbortError') {
      throw new ApiError('Server terlalu lama menjawab. Coba lagi beberapa saat.')
    }
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan layanan sedang aktif.')
  } finally {
    clearTimeout(timer)
  }
}

export function getData(payload, isValid, serviceName) {
  if (!payload || !isValid(payload.data)) {
    throw new ApiError(`Respons ${serviceName} tidak sesuai format yang diharapkan.`)
  }
  return payload.data
}

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
