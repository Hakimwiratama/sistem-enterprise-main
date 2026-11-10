import { getData, isRecord, request, services } from './http.js'

export const cartApi = {
  async get(userId) {
    const payload = await request(services.cart, `/carts/${userId}`)
    return getData(
      payload,
      (data) => isRecord(data) && Array.isArray(data.items),
      'Cart Service',
    )
  },

  async add(userId, productId, quantity = 1) {
    return request(services.cart, '/carts', {
      method: 'POST',
      body: { user_id: userId, product_id: productId, quantity },
    })
  },

  async update(itemId, quantity) {
    return request(services.cart, `/carts/items/${itemId}`, {
      method: 'PUT',
      body: { quantity },
    })
  },

  async remove(itemId) {
    return request(services.cart, `/carts/items/${itemId}`, { method: 'DELETE' })
  },

  async clear(userId) {
    return request(services.cart, `/carts/${userId}`, { method: 'DELETE' })
  },
}
