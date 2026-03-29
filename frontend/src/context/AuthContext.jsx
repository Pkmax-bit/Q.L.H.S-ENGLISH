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
      const { data } = await authService.getProfile()
      const userData = data.data || data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      // If 401 and refresh also fails, the api interceptor handles it.
      // Don't clear user here — the cached user is still valid until logout.
      // Only clear if there's truly no valid session.
      const cachedUser = localStorage.getItem('user')
      if (!cachedUser) {
        // No cached user at all — really logged out
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      }
      // Otherwise keep cached user — token might have been refreshed by interceptor
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const login = async (credentials) => {
    const { data } = await authService.login(credentials)
    const result = data.data || data
    localStorage.setItem('accessToken', result.accessToken)
    localStorage.setItem('refreshToken', result.refreshToken)
    const userData = result.user
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
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
