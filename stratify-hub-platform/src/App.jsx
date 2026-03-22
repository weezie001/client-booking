import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatBot from './components/ChatBot'
import HomePage from './pages/HomePage'
import BlogPage from './pages/BlogPage'
import AuthPage from './pages/AuthPage'
import CelebrityDetailPage from './pages/CelebrityDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/celebrity/:id" element={<CelebrityDetailPage />} />
      </Routes>
      <Footer />
      <ChatBot />
    </BrowserRouter>
  )
}

export default App
