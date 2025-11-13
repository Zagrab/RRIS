import { useContext, useEffect, useState, useCallback } from 'react'
import { AuthContext } from './AuthProvider'
import supabase from './supabase'

export type AuthUser = {
  id?: string
  email?: string | null
}

export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx) {
    return ctx
  }

  // Fallback: previously-used behavior if not wrapped in provider
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(data?.user ?? null)
      } catch (err) {
        console.warn('Error fetching supabase user', err)
      } finally {
        setInitializing(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setInitializing(false)
    })

    return () => {
      mounted = false
      // unsubscribe if available
      ;(subscription as any)?.subscription?.unsubscribe?.()
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.warn('Error signing out', err)
    }
  }, [])

  return { user, signOut, initializing }
}
