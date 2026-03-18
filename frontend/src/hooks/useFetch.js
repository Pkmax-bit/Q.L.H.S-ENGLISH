import { useState, useEffect, useCallback } from 'react'

export function useFetch(fetchFn, deps = [], autoFetch = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchFn(...args)
      const result = response.data?.data ?? response.data
      setData(result)
      return result
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Có lỗi xảy ra'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFetch) {
      execute()
    }
  }, [execute, autoFetch])

  return { data, loading, error, execute, setData }
}
