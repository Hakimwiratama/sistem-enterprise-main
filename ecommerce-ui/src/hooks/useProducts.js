import { useCallback } from 'react'
import { productApi } from '../api/productApi.js'
import useAsync from './useAsync.js'

export default function useProducts() {
  const loadProducts = useCallback(() => productApi.list(), [])
  return useAsync(loadProducts, { key: 'products', initialData: [] })
}
