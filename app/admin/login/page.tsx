'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import { useAdmin } from '@/contexts/AdminContext'
import { useToast } from '@/components/ui/Toast'

export default function AdminLoginPage() {
  const router = useRouter()
  const { admin, loading: adminLoading, login } = useAdmin()
  const { success, error: showError } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect jika sudah login
  useEffect(() => {
    if (!adminLoading && admin) {
      router.push('/admin/dashboard')
    }
  }, [admin, adminLoading, router])

  // Timeout untuk loading state (fallback jika stuck)
  useEffect(() => {
    if (adminLoading) {
      const timeout = setTimeout(() => {
        console.warn('Admin loading taking too long, showing login form anyway')
      }, 5000) // 5 seconds
      return () => clearTimeout(timeout)
    }
  }, [adminLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi')
      showError('Email dan password wajib diisi')
      setLoading(false)
      return
    }
    
    try {
      await login(email.trim(), password)
      success('Login berhasil! Selamat datang.')
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 500)
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMsg = err.message || 'Email atau password salah'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Show loading only for first 3 seconds, then show form anyway
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-serif">Memuat...</p>
        </div>
      </div>
    )
  }

  if (admin) {
    return null // Will redirect
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

      <div className="relative z-10 w-full max-w-sm">
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

        {/* Login Card - Glass Morphism Elegant */}
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
                Admin Login
              </h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-3"></div>
              <p className="text-gray-200 text-sm font-serif">
                Masuk ke dashboard admin
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-serif relative z-10">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@ganeshagym.id"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/60 transition-all text-sm font-serif placeholder:text-gray-300 relative z-10"
                  />
                </div>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
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

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent to-accent-light text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center space-x-2 font-montserrat uppercase text-sm tracking-wide relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>MASUK</span>
                  </>
                )}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 animate-shimmer" />
              </button>


            </form>

            {/* Info */}
            <div className="mt-6 text-center relative z-10">
              <div className="flex items-center justify-center space-x-2 text-gray-300 text-xs font-serif">
                <Shield className="w-3 h-3 text-accent" />
                <span>Hanya untuk staff yang terdaftar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 relative z-10">
          <p className="text-gray-400 text-xs font-serif">
            &copy; {new Date().getFullYear()} Ganesha Gym. All rights reserved.
          </p>
          <Link href="/" className="text-accent hover:text-accent-light text-xs font-serif mt-2 inline-block">
            Kembali ke Landing Page
          </Link>
        </div>
      </div>
    </div>
  )
}
