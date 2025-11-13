import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuth from '../lib/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()
  if (initializing) {
    // don't redirect while the auth state is still being determined
    return null
  }
  if (!user) {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}
