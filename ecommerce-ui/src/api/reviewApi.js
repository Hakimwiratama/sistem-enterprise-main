import { getData, isRecord, request, services } from './http.js'

export const reviewApi = {
  async listForProduct(productId) {
    const payload = await request(services.review, `/reviews/product/${productId}`)
    return getData(
      payload,
      (data) => isRecord(data) && isRecord(data.summary) && Array.isArray(data.reviews),
      'Review Service',
    )
  },

  async create(review) {
    return request(services.review, '/reviews', {
      method: 'POST',
      body: review,
    })
  },
}
