import React, { createContext, useEffect, useRef, useState } from 'react'
import supabase from './supabase'

export type AuthUser = {
  id?: string
  email?: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  signOut: () => Promise<void>
  initializing: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_EXPIRES_KEY = 'rris_session_expires_at'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const timeoutRef = useRef<number | null>(null)

  // helper to clear expiry
  const clearExpiry = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    try {
      localStorage.removeItem(SESSION_EXPIRES_KEY)
    } catch (e) {
      // ignore
    }
  }

  const scheduleSignOut = (msFromNow: number) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(async () => {
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.warn('Error signing out after expiry', e)
      }
      setUser(null)
      clearExpiry()
      setInitializing(false)
    }, msFromNow)
  }

  // signOut function exposed to consumers
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Error signing out', err)
    } finally {
      setUser(null)
      clearExpiry()
      setInitializing(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(data?.user ?? null)

        // If there's an expiry saved, restore timer
        const stored = localStorage.getItem(SESSION_EXPIRES_KEY)
        if (stored) {
          const expiresAt = parseInt(stored, 10)
          const now = Date.now()
          if (expiresAt <= now) {
            // already expired
            await supabase.auth.signOut()
            setUser(null)
            clearExpiry()
          } else {
            scheduleSignOut(expiresAt - now)
          }
        }
      } catch (err) {
        console.warn('Error fetching supabase user', err)
      } finally {
        // mark initialization done regardless of success
        setInitializing(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        // schedule expiry 30 minutes from now
        const expiresAt = Date.now() + SESSION_TTL_MS
        try {
          localStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt))
        } catch (e) {
          console.warn('Error saving session expiry', e)
        }
        scheduleSignOut(SESSION_TTL_MS)
        setInitializing(false)
      } else {
        clearExpiry()
        setInitializing(false)
      }
    })

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe?.()
      clearExpiry()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, signOut, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}
