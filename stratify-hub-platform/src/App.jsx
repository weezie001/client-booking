import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatBot from './components/ChatBot'
import HomePage from './pages/HomePage'
import BlogPage from './pages/BlogPage'
import AuthPage from './pages/AuthPage'
import CelebrityDetailPage from './pages/CelebrityDetailPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import BlogDetailPage from './pages/BlogDetailPage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { isLoggedIn, isAdmin } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"                   element={<HomePage />} />
        <Route path="/blog"               element={<BlogPage />} />
        <Route path="/blog/:id"           element={<BlogDetailPage />} />
        <Route path="/auth"               element={<AuthPage />} />
        <Route path="/reset-password"     element={<ResetPasswordPage />} />
        <Route path="/celebrity/:id"      element={<CelebrityDetailPage />} />
        <Route path="/dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin"              element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
      <ChatBot />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
