'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type VisitorProfileContextValue = {
  premiumAccess: boolean
  /** True sampai fetch profil pertama selesai (atau tidak ada identitas). */
  profileLoading: boolean
  identityEmail: string | null
  identityUsername: string | null
  refetchProfile: () => Promise<void>
}

const VisitorProfileContext = createContext<VisitorProfileContextValue | null>(null)

export function VisitorProfileProvider({
  children,
  identityEmail,
  identityUsername,
}: {
  children: React.ReactNode
  identityEmail: string | null
  identityUsername: string | null
}) {
  const [premiumAccess, setPremiumAccess] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  const refetchProfile = useCallback(async () => {
    if (!identityEmail && !identityUsername) {
      setPremiumAccess(false)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    try {
      const query = identityEmail
        ? `email=${encodeURIComponent(identityEmail)}`
        : `username=${encodeURIComponent(identityUsername || '')}`
      const response = await fetch(`/api/members/profile?${query}`)
      if (!response.ok) {
        setPremiumAccess(false)
        return
      }
      const data = await response.json()
      setPremiumAccess(!!data?.member?.premiumAccess)
    } catch {
      setPremiumAccess(false)
    } finally {
      setProfileLoading(false)
    }
  }, [identityEmail, identityUsername])

  useEffect(() => {
    void refetchProfile()
  }, [refetchProfile])

  useEffect(() => {
    const onPremium = () => {
      void refetchProfile()
    }
    window.addEventListener('premium-access-updated', onPremium)
    return () => window.removeEventListener('premium-access-updated', onPremium)
  }, [refetchProfile])

  return (
    <VisitorProfileContext.Provider
      value={{
        premiumAccess,
        profileLoading,
        identityEmail,
        identityUsername,
        refetchProfile,
      }}
    >
      {children}
    </VisitorProfileContext.Provider>
  )
}

export function useVisitorProfile() {
  const ctx = useContext(VisitorProfileContext)
  if (!ctx) {
    throw new Error('useVisitorProfile harus dipakai di dalam VisitorProfileProvider')
  }
  return ctx
}
