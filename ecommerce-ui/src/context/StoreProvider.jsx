import { useCallback, useMemo, useState } from 'react'
import useCart from '../hooks/useCart.js'
import useOrders from '../hooks/useOrders.js'
import useProducts from '../hooks/useProducts.js'
import { formatError } from '../utils/format.js'
import StoreContext from './storeContext.js'

const DEFAULT_USER_ID = 1

function readUserId() {
  const savedUserId = Number(window.localStorage.getItem('serambi-user-id'))
  return Number.isInteger(savedUserId) && savedUserId >= 1 && savedUserId <= 5
    ? savedUserId
    : DEFAULT_USER_ID
}

export default function StoreProvider({ children }) {
  const [userId, setUserId] = useState(readUserId)
  const [notice, setNotice] = useState(null)
  const [busyActions, setBusyActions] = useState({})
  const products = useProducts()
  const cart = useCart(userId)
  const orders = useOrders(userId)

  const changeUserId = useCallback((value) => {
    const nextUserId = Number(value)
    if (!Number.isInteger(nextUserId) || nextUserId < 1 || nextUserId > 5) {
      throw new Error('Pilih ID pengguna demo antara 1 sampai 5.')
    }

    window.localStorage.setItem('serambi-user-id', String(nextUserId))
    setUserId(nextUserId)
  }, [])

  const runAction = useCallback(async (key, operation, successMessage) => {
    setBusyActions((current) => ({ ...current, [key]: true }))
    try {
      const result = await operation()
      if (successMessage) setNotice({ message: successMessage, tone: 'success' })
      return result
    } catch (error) {
      setNotice({ message: formatError(error), tone: 'error' })
      return null
    } finally {
      setBusyActions((current) => ({ ...current, [key]: false }))
    }
  }, [])

  const cartQuantity = cart.data.items.reduce(
    (total, item) => total + Number(item.quantity),
    0,
  )
  const productById = useMemo(
    () => new Map(products.data.map((product) => [Number(product.id), product])),
    [products.data],
  )
  const cartTotal = cart.data.items.reduce((total, item) => {
    const product = productById.get(Number(item.product_id))
    return total + (product ? Number(product.price) * Number(item.quantity) : 0)
  }, 0)

  const value = {
    userId,
    changeUserId,
    products,
    cart,
    cartQuantity,
    cartTotal,
    productById,
    orders,
    notice,
    setNotice,
    busyActions,
    runAction,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
