import { createContext, useState, useEffect, useCallback } from 'react'
import authService from '../services/auth.service'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await authService.getProfile()
      const body = res?.data
      const userData = body?.data ?? body
      if (userData?.id) {
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (err) {
      const cachedUser = localStorage.getItem('user')
      if (!cachedUser) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const login = async (credentials) => {
    const res = await authService.login(credentials)
    const result = res?.data?.data || res?.data
    localStorage.setItem('accessToken', result.accessToken)
    localStorage.setItem('refreshToken', result.refreshToken)
    const userData = result.user
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    // Đồng bộ lại hồ sơ đầy đủ (avatar_url, bio, …)
    try {
      await fetchProfile()
    } catch {
      /* keep login user */
    }
    return userData
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
