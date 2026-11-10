import { useCallback } from 'react'
import { orderApi } from '../api/orderApi.js'
import useAsync from './useAsync.js'

export default function useOrders(userId) {
  const loadOrders = useCallback(() => orderApi.listForUser(userId), [userId])
  const { reload, ...orders } = useAsync(loadOrders, {
    key: `orders-${userId}`,
    initialData: [],
  })

  const checkout = useCallback(async () => {
    const order = await orderApi.checkout(userId)
    await reload()
    return order
  }, [reload, userId])

  const pay = useCallback((orderId) => orderApi.pay(orderId), [])
  const cancel = useCallback((orderId) => orderApi.cancel(orderId), [])
  const get = useCallback((orderId) => orderApi.get(orderId), [])

  return { ...orders, reload, checkout, pay, cancel, get }
}
