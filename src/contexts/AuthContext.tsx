'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

interface AuthContextValue {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(
      () => {
        logout()
      },
      30 * 60 * 1000 // 30 minutes
    )
  }

  const logout = async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (isFirebaseConfigured && auth) {
      await signOut(auth)
    }
    setUser(null)
    router.push('/login')
  }

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return
    }

    // Fallback: if Firebase Auth doesn't respond in 5s (e.g. Auth not enabled in Console),
    // stop loading so the guard can redirect to /login instead of hanging forever.
    const timeout = setTimeout(() => setLoading(false), 5000)

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        clearTimeout(timeout)
        setUser(firebaseUser)
        setLoading(false)
        if (firebaseUser) {
          resetInactivityTimer()
        }
      },
      () => {
        // Auth error (e.g. project not configured) — stop loading
        clearTimeout(timeout)
        setLoading(false)
      },
    )

    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for user activity to reset inactivity timer
  useEffect(() => {
    if (!user) return
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer))
    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, resetInactivityTimer)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
