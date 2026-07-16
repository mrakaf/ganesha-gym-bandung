'use client'
export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft, Shield } from 'lucide-react'
import { useToast, ToastContainer } from '@/components/ui/Toast'

function ForgotPasswordInner() {
  const searchParams = useSearchParams()
  const isFromAdmin = searchParams.get('from') === 'admin'

  const { toasts, success, error: showError, removeToast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const value = email.trim()
      if (!value) {
        showError('Email wajib diisi')
        return
      }
      // Pilih endpoint berdasarkan asal (admin atau member)
      const endpoint = isFromAdmin
        ? '/api/admin/forgot-password'
        : '/api/members/forgot-password'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Gagal mengirim email reset password')
      }
      success('Jika email terdaftar, link reset password akan dikirim.')
      setDone(true)
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
              Lupa Password?
            </h1>
            <p className="text-gray-200 text-sm font-serif">
              Masukkan email yang terdaftar untuk menerima link reset password.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
            {!done ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-accent via-accent-light to-accent text-white font-serif font-bold py-3.5 px-6 rounded-lg hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Memproses...' : 'Kirim Link Reset'}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-gray-100 font-serif">
                  Jika email terdaftar, link reset password akan dikirim.
                </p>
                <p className="text-gray-300 text-sm font-serif">
                  Cek inbox/spam. Link berlaku 1 jam.
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-accent hover:text-accent-light font-serif font-semibold transition-colors inline-flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Login</span>
              </Link>
            </div>

            {/* Tombol kecil subtle untuk kembali ke login admin */}
            {isFromAdmin && (
              <div className="mt-3 text-center">
                <Link
                  href="/admin/login"
                  className="text-gray-400/60 hover:text-gray-300 transition-colors inline-flex items-center space-x-1.5 text-[11px] font-serif"
                >
                  <Shield className="w-3 h-3" />
                  <span>Login Admin</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-serif">Memuat...</p>
        </div>
      </div>
    }>
      <ForgotPasswordInner />
    </Suspense>
  )
}
