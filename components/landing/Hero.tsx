'use client'

import Link from 'next/link'
import { Sparkles, TrendingUp, Award, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import TypingAnimation from './TypingAnimation'

const LandingParticles = dynamic(() => import('./LandingParticles'), {
  ssr: false,
  loading: () => null,
})

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [currentTypingIndex, setCurrentTypingIndex] = useState(0)
  const [isTypingComplete, setIsTypingComplete] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    // Start typing animation after hero text appears
    const timer = setTimeout(() => {
      setShowTyping(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const typingTexts = [
    "Fitness Center Terbaik",
    "Alat Gym Import Berkualitas",
    "Fasilitas Lengkap & Modern",
    "Transform Your Body",
  ]

  const handleTypingComplete = () => {
    setIsTypingComplete(true)
    // Wait 2 seconds before changing to next text
    setTimeout(() => {
      setCurrentTypingIndex((prev) => (prev + 1) % typingTexts.length)
      setIsTypingComplete(false)
    }, 2000)
  }

  useEffect(() => {
    if (showTyping && isTypingComplete) {
      // Reset typing state when text changes
      setIsTypingComplete(false)
    }
  }, [currentTypingIndex, showTyping, isTypingComplete])

  return (
    <section className="relative text-white pt-10 pb-12 md:pt-14 md:pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
      {/* Particles — scoped ONLY to hero section */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <LandingParticles />
      </div>

      {/* Hero local subtle accents */}
      <div className="pointer-events-none absolute inset-0 opacity-60 z-0">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full opacity-30 blur-[100px]"
             style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)' }} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full mb-4 transition-all duration-700 border border-cyan-400/25 bg-white/5 backdrop-blur-md shadow-[0_0_30px_-10px_rgba(34,211,238,0.5)] ${isVisible ? 'animate-slide-down-fade opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-xs uppercase tracking-[0.25em] font-poppins font-semibold text-cyan-100">Smart Gym Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-oswald font-bold mb-3 transition-all duration-800 ${isVisible ? 'animate-slide-up-fade opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.2s', letterSpacing: '0.04em' }}>
            <span className="text-white drop-shadow-[0_2px_30px_rgba(34,211,238,0.15)]">DARE TO BE</span>
            <span
              className={`block transition-all duration-800 ${isVisible ? 'animate-zoom-in opacity-100 scale-100' : 'opacity-0 scale-0'}`}
              style={{
                transitionDelay: '0.4s',
                background: 'linear-gradient(120deg, #67e8f9 0%, #60a5fa 45%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              GREAT
            </span>
          </h1>

          {/* Typing Animation */}
          <div className={`h-10 md:h-12 mb-3 transition-all duration-700 ${showTyping ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '1s' }}>
            {showTyping && (
              <div className="text-lg md:text-xl lg:text-2xl font-montserrat font-semibold text-gray-100 min-h-[2.5rem] flex items-center justify-center">
                <TypingAnimation
                  key={currentTypingIndex}
                  text={typingTexts[currentTypingIndex]}
                  speed={80}
                  className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent"
                  onComplete={handleTypingComplete}
                />
              </div>
            )}
          </div>

          <p className={`text-sm md:text-base mb-6 text-slate-300 leading-relaxed transition-all duration-700 font-poppins max-w-2xl mx-auto ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0.8s' }}>
            Alat gym import luar negeri, kamar mandi bersih terawat, loker tersedia,
            parkiran luas, dan tempat nongkrong smoking area.
          </p>

          {/* Feature Icons */}
          <div className={`flex justify-center items-center gap-5 md:gap-8 mb-7 transition-all duration-700 ${isVisible ? 'animate-rotate-in opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '1s' }}>
            {[
              { Icon: TrendingUp, label: 'Terpercaya', color: 'cyan' },
              { Icon: Award, label: 'Berkualitas', color: 'blue' },
              { Icon: Zap, label: 'Terjangkau', color: 'purple' },
            ].map(({ Icon, label, color }, i) => {
              const colorMap: Record<string, string> = {
                cyan: 'group-hover:shadow-[0_0_30px_-4px_rgba(34,211,238,0.6)] group-hover:border-cyan-400/60',
                blue: 'group-hover:shadow-[0_0_30px_-4px_rgba(59,130,246,0.6)] group-hover:border-blue-400/60',
                purple: 'group-hover:shadow-[0_0_30px_-4px_rgba(168,85,247,0.6)] group-hover:border-purple-400/60',
              }
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 group">
                  <div className={`p-2.5 rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-md transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:bg-white/[0.08] ${colorMap[color]}`}>
                    <Icon className="w-4 h-4 text-cyan-300 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-poppins font-medium group-hover:text-white transition-colors">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
