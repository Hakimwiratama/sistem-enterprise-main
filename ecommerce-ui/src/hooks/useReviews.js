import { useCallback } from 'react'
import { reviewApi } from '../api/reviewApi.js'
import useAsync from './useAsync.js'

const EMPTY_REVIEWS = {
  summary: { average_rating: 0, total_reviews: 0 },
  reviews: [],
}

export default function useReviews(productId) {
  const loadReviews = useCallback(
    () => reviewApi.listForProduct(productId),
    [productId],
  )
  const { reload, ...reviews } = useAsync(loadReviews, {
    key: `reviews-${productId}`,
    initialData: EMPTY_REVIEWS,
  })

  const create = useCallback(async (userId, rating, comment) => {
    const result = await reviewApi.create({
      product_id: Number(productId),
      user_id: Number(userId),
      rating: Number(rating),
      comment: comment.trim(),
    })
    await reload()
    return result
  }, [productId, reload])

  return { ...reviews, reload, create }
}
