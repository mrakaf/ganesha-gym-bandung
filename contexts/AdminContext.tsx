'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface Admin {
  id: string
  email: string
  name: string
  role: string
}

interface AdminContextType {
  admin: Admin | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAdmin: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const refreshAdmin = useCallback(async () => {
    // Only check admin status if we're on an admin page
    if (!pathname.startsWith('/admin')) {
      setLoading(false)
      setAdmin(null)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/me')
      if (response.ok) {
        const data = await response.json()
        setAdmin(data.admin)
      } else {
        // 401 is expected if not logged in, don't log as error
        if (response.status === 401) {
          setAdmin(null)
        } else {
          // Only log non-401 errors
          console.error('Error refreshing admin:', response.status, response.statusText)
          setAdmin(null)
        }
      }
    } catch (error) {
      // Network errors or other issues - only log if on admin page
      if (pathname.startsWith('/admin')) {
        console.error('Error refreshing admin:', error)
      }
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    refreshAdmin()
    
    // Timeout untuk memastikan loading tidak stuck (ditingkatkan untuk database connection)
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 10000) // 10 seconds timeout (ditingkatkan dari 5 detik)

    return () => clearTimeout(timeout)
  }, [refreshAdmin])

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    // Clone response untuk bisa dibaca beberapa kali jika perlu
    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      
      if (isJson) {
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError)
          errorMessage = `HTTP error! status: ${response.status}. Pastikan database sudah dikonfigurasi.`
        }
      } else {
        // Response is not JSON (might be HTML error page)
        try {
          const text = await response.text()
          console.error('Non-JSON error response:', text.substring(0, 200))
          errorMessage = `HTTP error! status: ${response.status}. Pastikan database sudah dikonfigurasi.`
        } catch (textError) {
          console.error('Error reading error response:', textError)
          errorMessage = `HTTP error! status: ${response.status}. Pastikan database sudah dikonfigurasi.`
        }
      }
      
      throw new Error(errorMessage)
    }

    // Parse JSON response (only if response is ok)
    if (!isJson) {
      throw new Error('Response dari server bukan JSON. Pastikan API route berfungsi dengan benar.')
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError)
      throw new Error('Terjadi kesalahan saat memproses response dari server.')
    }

    if (data.error) {
      throw new Error(data.error)
    }

    if (!data.admin) {
      throw new Error('Response tidak valid: admin data tidak ditemukan.')
    }

    setAdmin(data.admin)
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setAdmin(null)
      // Router push akan dilakukan di component yang menggunakan logout
    }
  }, [])

  return (
    <AdminContext.Provider value={{ admin, loading, login, logout, refreshAdmin }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

