'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut 
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  isFirebaseReady: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  useEffect(() => {
    // Timeout untuk memastikan loading tidak infinite
    const timeout = setTimeout(() => {
      setLoading(false)
      console.warn('Auth loading timeout - setting loading to false')
    }, 3000) // 3 detik timeout

    // Check if Firebase is configured
    if (!auth) {
      console.warn('Firebase is not configured. Please set up environment variables.')
      setLoading(false)
      setIsFirebaseReady(false)
      clearTimeout(timeout)
      return () => clearTimeout(timeout)
    }

    setIsFirebaseReady(true)
    
    // Set up auth state listener
    try {
      const unsubscribe = onAuthStateChanged(
        auth, 
        (user) => {
          setUser(user)
          setLoading(false)
          clearTimeout(timeout)
        }, 
        (error) => {
          console.error('Auth state error:', error)
          setLoading(false)
          clearTimeout(timeout)
        }
      )

      return () => {
        unsubscribe()
        clearTimeout(timeout)
      }
    } catch (error) {
      console.error('Error setting up auth listener:', error)
      setLoading(false)
      setIsFirebaseReady(false)
      clearTimeout(timeout)
      return () => clearTimeout(timeout)
    }
  }, []) // Empty dependency array - hanya run sekali saat mount

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase is not configured. Please set up environment variables in .env.local')
    }
    
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    if (!auth) {
      throw new Error('Firebase is not configured')
    }
    
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, isFirebaseReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
