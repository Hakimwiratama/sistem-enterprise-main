import { getData, isRecord, request, services } from './http.js'

export const productApi = {
  async list() {
    const payload = await request(services.product, '/products')
    return getData(payload, Array.isArray, 'Product Service')
  },

  async get(productId) {
    const payload = await request(services.product, `/products/${productId}`)
    return getData(payload, isRecord, 'Product Service')
  },

  async create(formData, token) {
    const payload = await request(services.product, '/products', {
      method: 'POST',
      body: formData,
      token,
    })
    return getData(payload, isRecord, 'Product Service')
  },

  async update(productId, formData, token) {
    const payload = await request(services.product, `/products/${productId}`, {
      method: 'PUT',
      body: formData,
      token,
    })
    return getData(payload, isRecord, 'Product Service')
  },

  async delete(productId, token) {
    return request(services.product, `/products/${productId}`, {
      method: 'DELETE',
      token,
    })
  },
}
