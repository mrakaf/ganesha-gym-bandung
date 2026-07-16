'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { User, Phone, Save, ArrowRight } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { getMemberSession, type MemberSession } from '@/lib/member-session'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toasts, success, error: showError, removeToast } = useToast()
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const identityEmail = user?.email || memberSession?.email || null

  useEffect(() => {
    setMemberSession(getMemberSession())
  }, [])

  useEffect(() => {
    if (!authLoading && !user && !memberSession) {
      router.push('/login')
    } else if (user || memberSession) {
      setFormData({
        name: user?.displayName || memberSession?.name || identityEmail?.split('@')[0] || '',
        phone: '',
      })
    }
  }, [user, memberSession, identityEmail, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Nama lengkap wajib diisi')
      return
    }

    if (!formData.phone.trim()) {
      setError('Nomor telepon wajib diisi')
      return
    }

    // Validate phone number (simple validation)
    const phoneRegex = /^[0-9]{10,13}$/
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Nomor telepon tidak valid (10-13 digit)')
      return
    }

    setLoading(true)

    try {
      // Update member profile
      const response = await fetch('/api/members/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: identityEmail,
          name: formData.name,
          phone: formData.phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan profile')
      }

      // Show success message
      success('Profile berhasil dilengkapi!')
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/visitor/dashboard')
      }, 1000)
    } catch (err: any) {
      const errorMsg = err.message || 'Terjadi kesalahan saat menyimpan profile'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-serif">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user && !memberSession) {
    return null
  }

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light py-12 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(217, 119, 6, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(217, 119, 6, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/logoganesha.jpeg"
              alt="Ganesha Gym Logo"
              width={64}
              height={64}
              className="rounded-xl shadow-2xl border-2 border-accent/40"
            />
          </div>
          <h1 className="text-3xl font-oswald font-bold text-white mb-1 tracking-wide drop-shadow-lg">
            LENGKAPI PROFILE
          </h1>
          <p className="text-gray-300 text-xs font-serif italic">Ganesha Gym</p>
        </div>

        {/* Complete Profile Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-accent/10 to-secondary/20 rounded-2xl blur-xl opacity-50"></div>
          
          <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide drop-shadow-md">
                Selamat Datang!
              </h2>
              <p className="text-gray-200 text-sm font-serif">
                Lengkapi data diri Anda untuk melanjutkan
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-serif">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Nama Lengkap
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Nomor Telepon
                </label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="08xxxxxxxxxx"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                </div>
                <p className="text-gray-400 text-xs font-poppins mt-1">
                  Format: 10-13 digit angka (contoh: 081234567890)
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent via-accent-light to-accent text-white font-serif font-bold py-3.5 px-6 rounded-lg hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center space-x-2 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10" />
                    <span className="relative z-10">Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">LENGKAPI PROFILE</span>
                    <ArrowRight className="w-4 h-4 relative z-10" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

