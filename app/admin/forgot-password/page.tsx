export const dynamic = 'force-dynamic';
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft, Shield } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function AdminForgotPasswordPage() {
  const { success, error: showError } = useToast()
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
      const res = await fetch('/api/admin/forgot-password', {
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
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide drop-shadow-md">
                  Lupa Password?
                </h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-3"></div>
                <p className="text-gray-200 text-sm font-serif">
                  Masukkan email yang terdaftar untuk menerima link reset password.
                </p>
              </div>

              {!done ? (
                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
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
                        placeholder="admin@ganeshagym.id"
                        className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-accent to-accent-light text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-[1.02] font-montserrat uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Memproses...' : 'Kirim Link Reset'}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-3 relative z-10">
                  <p className="text-gray-100 font-serif">
                    Jika email terdaftar, link reset password akan dikirim.
                  </p>
                  <p className="text-gray-300 text-sm font-serif">
                    Cek inbox/spam. Link berlaku 1 jam.
                  </p>
                </div>
              )}

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
