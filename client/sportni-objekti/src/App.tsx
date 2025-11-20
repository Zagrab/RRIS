import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import ManageObjects from './pages/ManageObjects'
import Reservations from './pages/Reservations'
import NotFound from './pages/NotFound'
import { AuthProvider } from './lib/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* public landing page */}
            <Route path="/" element={<Home />} />

            {/* reservations - requires auth */}
            <Route
              path="/reservations"
              element={
                <ProtectedRoute>
                  <Reservations />
                </ProtectedRoute>
              }
            />

            {/* management pages still require auth */}
            <Route
              path="/manage"
              element={
                <ProtectedRoute>
                  <ManageObjects />
                </ProtectedRoute>
              }
            />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <NotFound />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
