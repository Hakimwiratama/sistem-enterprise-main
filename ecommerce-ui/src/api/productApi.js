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
}
