import { useCallback, useEffect, useRef, useState } from 'react'

export default function useAsync(loader, { key, initialData }) {
  const requestId = useRef(0)
  const [state, setState] = useState({
    data: initialData,
    dataKey: undefined,
    loading: true,
    error: null,
  })

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const data = await loader()
      if (currentRequestId === requestId.current) {
        setState({ data, dataKey: key, loading: false, error: null })
      }
      return data
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setState((current) => ({
          ...current,
          dataKey: key,
          loading: false,
          error,
        }))
      }
      return null
    }
  }, [key, loader])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
    }
  }, [reload])

  const isCurrentKey = Object.is(state.dataKey, key)
  return {
    data: isCurrentKey ? state.data : initialData,
    loading: !isCurrentKey || state.loading,
    error: isCurrentKey ? state.error : null,
    reload,
    setData: (data) => setState({
      data,
      dataKey: key,
      loading: false,
      error: null,
    }),
  }
}
