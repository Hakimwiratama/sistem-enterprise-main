import { getData, isRecord, request, services } from './http.js'

export const orderApi = {
  async listForUser(userId) {
    const payload = await request(services.order, `/orders/user/${userId}`)
    return getData(payload, Array.isArray, 'Order Service')
  },

  async get(orderId) {
    const payload = await request(services.order, `/orders/${orderId}`)
    return getData(payload, isRecord, 'Order Service')
  },

  async checkout(userId) {
    const payload = await request(services.order, '/orders', {
      method: 'POST',
      body: { user_id: userId },
    })
    return getData(payload, isRecord, 'Order Service')
  },

  async pay(orderId) {
    const payload = await request(services.order, `/orders/${orderId}/pay`, {
      method: 'PATCH',
    })
    return getData(payload, isRecord, 'Order Service')
  },

  async cancel(orderId) {
    const payload = await request(services.order, `/orders/${orderId}/cancel`, {
      method: 'PUT',
    })
    return getData(payload, isRecord, 'Order Service')
  },
}
