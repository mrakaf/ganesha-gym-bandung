'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-out border-b ${
        scrolled
          ? 'bg-[#0f172a]/80 backdrop-blur-2xl border-white/[0.08] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]'
          : 'bg-transparent backdrop-blur-none border-transparent'
      }`}
    >
      <div className={`container mx-auto px-4 transition-all duration-500 ease-out ${scrolled ? 'py-3' : 'py-4'}`}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Image
                src="/images/logoganesha.jpeg"
                alt="Ganesha Gym Logo"
                width={scrolled ? 48 : 56}
                height={scrolled ? 48 : 56}
                className="rounded-lg ring-1 ring-white/10 transition-all duration-500 ease-out group-hover:ring-cyan-400/60 group-hover:shadow-[0_0_24px_-2px_rgba(34,211,238,0.55)] group-hover:scale-[1.04]"
              />
            </div>
            <div>
              <h1 className="text-xl font-oswald font-bold tracking-wider bg-gradient-to-r from-white via-white to-cyan-200 bg-clip-text text-transparent">
                GANESHA GYM
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70 font-medium">Fitness Center</p>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/login"
              className="btn-landing-primary ml-4"
            >
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm">Daftar Sekarang</span>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-all duration-300 ease-out"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 space-y-2 animate-fade-in-down">
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="btn-landing-primary w-full justify-center mt-3"
            >
              <Dumbbell className="w-4 h-4" />
              <span>Daftar Sekarang</span>
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
