import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

// Check if a stored token looks like a real JWT (3 base64 segments)
const isValidJwt = (t) => typeof t === 'string' && t.split('.').length === 3

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_user') || 'null') } catch { return null }
  })
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('sh_token')
    return isValidJwt(t) ? t : null
  })

  // Clear stale non-JWT tokens (e.g. old demo-token-X from pre-JWT era)
  useEffect(() => {
    const stored = localStorage.getItem('sh_token')
    if (stored && !isValidJwt(stored)) {
      localStorage.removeItem('sh_token')
      localStorage.removeItem('sh_user')
      setToken(null)
      setUser(null)
    }
  }, [])

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('sh_token', newToken)
    localStorage.setItem('sh_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sh_token')
    localStorage.removeItem('sh_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isLoggedIn: !!token,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

