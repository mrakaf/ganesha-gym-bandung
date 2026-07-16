export const dynamic = 'force-dynamic';
'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/ui/Toast'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const { toasts, success, error: showError, removeToast } = useToast()
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
      const res = await fetch('/api/members/reset-password', {
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
        router.push('/login')
      }, 800)
    } catch (err: any) {
      showError(err?.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/95 via-primary/90 to-accent/30" />

        <div className="relative z-10 w-full max-w-md">
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
            <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-wide drop-shadow-lg">
              Reset Password
            </h1>
            <p className="text-gray-200 text-sm font-serif">
              Buat password baru untuk akun Anda.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full bg-gradient-to-r from-accent via-accent-light to-accent text-white font-serif font-bold py-3.5 px-6 rounded-lg hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Simpan Password Baru'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-accent hover:text-accent-light font-serif font-semibold transition-colors inline-flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}

