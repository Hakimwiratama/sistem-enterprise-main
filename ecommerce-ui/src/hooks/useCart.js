import { useCallback } from 'react'
import { cartApi } from '../api/cartApi.js'
import useAsync from './useAsync.js'

const EMPTY_CART = { items: [], total_quantity: 0 }

export default function useCart(userId) {
  const loadCart = useCallback(() => cartApi.get(userId), [userId])
  const { reload, ...cart } = useAsync(loadCart, {
    key: `cart-${userId}`,
    initialData: EMPTY_CART,
  })

  const add = useCallback(async (productId, quantity = 1) => {
    const result = await cartApi.add(userId, productId, quantity)
    await reload()
    return result
  }, [reload, userId])

  const update = useCallback(async (itemId, quantity) => {
    const result = await cartApi.update(itemId, quantity)
    await reload()
    return result
  }, [reload])

  const remove = useCallback(async (itemId) => {
    const result = await cartApi.remove(itemId)
    await reload()
    return result
  }, [reload])

  const clear = useCallback(async () => {
    const result = await cartApi.clear(userId)
    await reload()
    return result
  }, [reload, userId])

  return { ...cart, reload, add, update, remove, clear }
}
