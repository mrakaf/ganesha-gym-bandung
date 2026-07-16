export const dynamic = 'force-dynamic';
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, Eye, EyeOff, User, UserPlus, ArrowRight, ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { setMemberSession } from '@/lib/member-session'

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle, isFirebaseReady } = useAuth()
  const { toasts, success, error: showError, removeToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect jika sudah login dengan Google
  useEffect(() => {
    if (!authLoading && user) {
      // Create member di database (background, tidak blocking)
      if (user.email) {
        createMemberInBackground(user.email, user.displayName || user.email.split('@')[0])
      }
      
      // Google login langsung masuk dashboard
      success('Registrasi berhasil! Selamat datang.')
      setTimeout(() => {
        router.push('/visitor/dashboard')
      }, 500)
    }
  }, [user, authLoading, router])

  // Create member di background (tidak blocking, tidak perlu wait)
  const createMemberInBackground = async (email: string, name: string) => {
    try {
      console.log('Creating member in background:', email)
      const response = await fetch('/api/members/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to create member:', errorData.error)
        return
      }
      
      const data = await response.json()
      console.log('Member created/checked successfully:', data.member?.email)
    } catch (error) {
      // Silent error - tidak perlu show notification karena tidak blocking
      console.error('Background member creation failed (non-critical):', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('') // Clear error saat user mengetik
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) {
      setError('Nama lengkap wajib diisi')
      showError('Nama lengkap wajib diisi')
      return
    }

    if (!formData.username.trim()) {
      setError('Username wajib diisi')
      showError('Username wajib diisi')
      return
    }

    if (!formData.email.trim()) {
      setError('Email wajib diisi')
      showError('Email wajib diisi')
      return
    }

    // Validate email format (simple)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Format email tidak valid')
      showError('Format email tidak valid')
      return
    }

    // Validate username (simple: 3-30 chars, no spaces)
    const username = formData.username.trim()
    if (username.length < 3 || username.length > 30 || /\s/.test(username)) {
      setError('Username cukup 3-30 karakter dan tanpa spasi')
      showError('Username cukup 3-30 karakter dan tanpa spasi')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok!')
      showError('Password tidak cocok!')
      return
    }

    if (formData.password.length < 8) {
      setError('Password minimal 8 karakter!')
      showError('Password minimal 8 karakter!')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/members/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          username,
          password: formData.password,
        }),
      })

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error message
        let errorData
        try {
          errorData = await response.json()
        } catch {
          // If JSON parse fails, it might be HTML error page
          throw new Error(`HTTP error! status: ${response.status}. Pastikan database sudah dikonfigurasi.`)
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Check if response has error
      if (data.error) {
        throw new Error(data.error)
      }

      // Auto login setelah register berhasil
      if (data?.member?.id) {
        setMemberSession({
          id: data.member.id,
          name: data.member.name || username,
          username: data.member.username ?? username,
          email: data.member.email ?? formData.email.trim().toLowerCase(),
        })
      }

      success('Registrasi berhasil! Selamat datang.')
      setTimeout(() => {
        router.push('/visitor/dashboard')
      }, 700)
    } catch (err: any) {
      console.error('Register error:', err)
      let errorMsg = 'Terjadi kesalahan saat registrasi'
      
      if (err.message) {
        errorMsg = err.message
      } else if (err instanceof SyntaxError) {
        errorMsg = 'Terjadi kesalahan saat memproses data. Pastikan database sudah dikonfigurasi dengan benar.'
      }
      
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isFirebaseReady) {
      const errorMsg = 'Firebase belum dikonfigurasi. Silakan setup Firebase terlebih dahulu.'
      setError(errorMsg)
      showError(errorMsg)
      return
    }

    setError('')
    setLoading(true)
    
    try {
      await signInWithGoogle()
      // Redirect akan otomatis terjadi via useEffect setelah user state update
      // Tidak perlu check member, langsung masuk
    } catch (err: any) {
      console.error('Google Sign-In Error:', err)
      
      let errorMessage = 'Terjadi kesalahan saat registrasi dengan Google'
      
      // Handle specific errors
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Registrasi dibatalkan. Popup ditutup sebelum proses selesai.'
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.'
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Koneksi internet bermasalah. Silakan cek koneksi Anda.'
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'Akun sudah terdaftar. Silakan login dengan akun yang sudah ada.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
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
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/95 via-primary/90 to-accent/30" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Branding - Elegant */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent/10 rounded-full blur-xl animate-pulse-slow"></div>
              <Image
                src="/images/logoganesha.jpeg"
                alt="Ganesha Gym Logo"
                width={64}
                height={64}
                className="rounded-xl shadow-2xl relative z-10 border-2 border-accent/40"
              />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1 tracking-wide drop-shadow-lg">
            GANESHA GYM
          </h1>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-2"></div>
          <p className="text-gray-300 text-xs font-serif italic">Fitness Center</p>
        </div>

        {/* Register Card - Glass Morphism Elegant */}
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
              <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide drop-shadow-md">
                Daftar Akun Baru
              </h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-3"></div>
              <p className="text-gray-200 text-sm font-serif">
                Buat akun untuk mulai menggunakan layanan Ganesha Gym
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-serif relative z-10">
                {error}
              </div>
            )}

            {/* Firebase Not Ready Warning */}
            {!isFirebaseReady && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200 text-sm font-serif relative z-10">
                ⚠️ Firebase belum dikonfigurasi. Silakan setup Firebase terlebih dahulu.
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Nama Lengkap
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Masukkan nama lengkap"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                </div>
              </div>

              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Masukkan username"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                </div>
                <p className="text-gray-400 text-xs font-poppins mt-1">
                  Cukup 3-30 karakter, tanpa spasi.
                </p>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Masukkan email aktif"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                </div>
                <p className="text-gray-400 text-xs font-poppins mt-1">
                  Digunakan untuk fitur Lupa Password.
                </p>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimal 8 karakter"
                    required
                    minLength={8}
                    className="w-full pl-11 pr-12 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-accent transition-colors z-10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-accent text-sm font-serif font-semibold mb-2 tracking-wide">
                  Konfirmasi Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-accent transition-colors z-10" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Ulangi password"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-accent transition-colors z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register Button - Elegant with Glow */}
              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-gradient-to-r from-accent via-accent-light to-accent text-white font-serif font-bold py-3.5 px-6 rounded-lg hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center space-x-2 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10" />
                    <span className="relative z-10">Memproses...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">DAFTAR</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider - Elegant */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white/10 backdrop-blur-sm px-4 text-gray-200 text-xs font-serif italic">
                  atau
                </span>
              </div>
            </div>

            {/* Google Sign In Button - Glass Effect */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading || authLoading || !isFirebaseReady}
              className="w-full bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-serif font-semibold py-3.5 px-6 rounded-lg hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center space-x-3 group text-sm relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="relative z-10">Daftar dengan Google</span>
            </button>

            {/* Login Link - Elegant */}
            <div className="mt-6 text-center">
              <p className="text-gray-200 text-sm font-serif">
                Sudah punya akun?{' '}
                <Link
                  href="/login"
                  className="text-accent hover:text-accent-light font-serif font-semibold transition-colors inline-flex items-center space-x-1 group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  <span>Masuk sekarang</span>
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Elegant */}
        <div className="text-center mt-6">
          <p className="text-gray-300 text-xs font-serif italic">
            &copy; {new Date().getFullYear()} Ganesha Gym. All rights reserved.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
