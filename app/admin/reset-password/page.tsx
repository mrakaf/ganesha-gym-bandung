export const dynamic = 'force-dynamic';
'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

function AdminResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const { success, error: showError } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      showError('Token reset tidak ditemukan')
      return
    }
    if (password.length < 8) {
      showError('Password minimal 8 karakter')
      return
    }
    if (password !== confirmPassword) {
      showError('Konfirmasi password tidak cocok')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal reset password')
      }
      success('Password berhasil direset. Silakan login kembali.')
      setTimeout(() => {
        router.push('/admin/login')
      }, 800)
    } catch (err: any) {
      showError(err?.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light py-12 px-4 relative overflow-hidden">
        {/* Elegant Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(217, 119, 6, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(217, 119, 6, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/98 via-primary/95 to-accent/25" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <Image
                  src="/images/logoganesha.jpeg"
                  alt="Ganesha Gym Logo"
                  width={56}
                  height={56}
                  className="rounded-lg shadow-lg border-2 border-accent/50"
                />
                <div className="absolute inset-0 rounded-lg ring-2 ring-accent/50 animate-pulse-slow" />
              </div>
            </div>
            <h1 className="text-2xl font-oswald font-bold text-white mb-1 drop-shadow-md">
              GANESHA GYM
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-2"></div>
            <p className="text-gray-300 text-xs font-serif italic">Admin Dashboard</p>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Glow Effect Behind Card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-accent/10 to-secondary/20 rounded-2xl blur-xl opacity-50"></div>
            
            {/* Main Card */}
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
              {/* Decorative Corner Accents */}
              <div className="absolute top-0 left-0 w-16 h-16">
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-accent/40 rounded-tl-lg"></div>
              </div>
              <div className="absolute top-0 right-0 w-16 h-16">
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-accent/40 rounded-tr-lg"></div>
              </div>
              <div className="absolute bottom-0 left-0 w-16 h-16">
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-accent/40 rounded-bl-lg"></div>
              </div>
              <div className="absolute bottom-0 right-0 w-16 h-16">
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-accent/40 rounded-br-lg"></div>
              </div>

              {/* Header */}
              <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-accent to-accent-light rounded-xl mb-3 shadow-lg">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide drop-shadow-md">
                  Reset Password
                </h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-3"></div>
                <p className="text-gray-200 text-sm font-serif">
                  Buat password baru untuk akun admin Anda.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label htmlFor="password" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                    Password Baru
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full pl-11 pr-12 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-accent transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                    Konfirmasi Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      className="w-full pl-11 pr-12 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-accent transition-colors z-10"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-accent to-accent-light text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-[1.02] font-montserrat uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Memproses...' : 'Simpan Password Baru'}
                </button>
              </form>

              {/* Links */}
              <div className="mt-6 space-y-3 relative z-10">
                <div className="border-t border-white/10 pt-4">
                  <Link
                    href="/admin/login"
                    className="flex items-center justify-center space-x-2 text-accent hover:text-accent-light font-serif font-semibold transition-colors group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Kembali ke Login Admin</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 relative z-10">
            <p className="text-gray-400 text-xs font-serif">
              &copy; {new Date().getFullYear()} Ganesha Gym. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    )
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-serif">Memuat...</p>
        </div>
      </div>
    }>
      <AdminResetPasswordInner />
    </Suspense>
  )
}
