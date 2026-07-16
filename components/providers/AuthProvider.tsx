'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { AdminProvider } from '@/contexts/AdminContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminProvider>
        {children}
      </AdminProvider>
    </AuthProvider>
  )
}

