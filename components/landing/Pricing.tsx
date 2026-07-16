'use client'

import Link from 'next/link'
import { Check, Star, Zap, Crown, ArrowRight, Info, Wallet, CreditCard, Gift, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function Pricing() {
  const [visibleCards, setVisibleCards] = useState<number[]>([])
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  const setCardRef = useCallback((index: number) => {
    return (el: HTMLDivElement | null): void => {
      cardsRef.current[index] = el
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0')
            setVisibleCards((prev) => {
              if (!prev.includes(index)) {
                return [...prev, index]
              }
              return prev
            })
          }
        })
      },
      { threshold: 0.1 }
    )

    const currentCards = cardsRef.current
    currentCards.forEach((card) => {
      if (card) observer.observe(card)
    })

    return () => {
      currentCards.forEach((card) => {
        if (card) observer.unobserve(card)
      })
    }
  }, [])

  type PricingPlan = {
    name: string
    price: string
    originalPrice?: string | null
    period: string
    description: string
    features: string[]
    popular: boolean
    type: string
    icon: any
    color: string
    note: string
    badgeIcon: any
  }

  const pricingPlans: PricingPlan[] = [
    {
      name: "Visit",
      price: "25.000",
      originalPrice: null,
      period: "per kunjungan",
      description: "Kunjungan sekali pakai, cocok untuk yang ingin coba dulu",
      features: [
        "Akses semua alat gym",
        "Kamar mandi",
        "Loker",
        "Parkiran gratis",
        "Tidak perlu kartu member",
      ],
      popular: false,
      type: "VISIT",
      icon: Zap,
      color: "from-blue-500 to-blue-600",
      note: "Bayar langsung di tempat",
      badgeIcon: Wallet,
    },
    {
      name: "Member Baru",
      price: "200.000",
      originalPrice: null,
      period: "per bulan",
      description: "Pendaftaran member baru termasuk kartu member",
      features: [
        "Membership 1 bulan penuh",
        "Akses semua fasilitas",
        "Kamar mandi, loker, parkiran",
        "Smoking area",
      ],
      popular: true,
      type: "MEMBERSHIP_NEW",
      icon: Crown,
      color: "from-accent to-accent-light",
      note: "Termasuk biaya pendaftaran",
      badgeIcon: Gift,
    },
    {
      name: "Perpanjangan",
      price: "160.000",
      originalPrice: null,
      period: "per bulan",
      description: "Perpanjangan membership untuk member aktif",
      features: [
        "Membership 1 bulan",
        "Akses semua fasilitas",
        "Kamar mandi, loker, parkiran",
        "Smoking area",
      ],
      popular: false,
      type: "MEMBERSHIP_RENEWAL",
      icon: Star,
      color: "from-secondary to-secondary-light",
      note: "Harga khusus member",
      badgeIcon: TrendingUp,
    },
  ]

  return (
    <section id="pricing" className="py-16 md:py-20 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header with Icon */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 mb-4 animate-slide-down-fade">
            <Wallet className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Paket Harga</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary mb-4 mt-2 animate-slide-up-fade">
            Pilih Paket <span className="gradient-text">Terbaik</span>
          </h2>
          <p className="text-base text-neutral leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Pilih paket yang sesuai dengan kebutuhan Anda. Semua paket memberikan akses penuh ke semua fasilitas.
          </p>
        </div>

        {/* Pricing Cards with Intersection Observer */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {pricingPlans.map((plan, index) => {
            const Icon = plan.icon
            const BadgeIcon = plan.badgeIcon
            const isVisible = visibleCards.includes(index)
            return (
              <div
                key={index}
                ref={setCardRef(index)}
                data-index={index}
                className={`relative bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl border-2 ${
                  plan.popular
                    ? "border-accent transform scale-105 md:scale-110"
                    : "border-gray-200 hover:border-accent/50"
                } ${
                  isVisible 
                    ? 'animate-flip-in opacity-100' 
                    : 'opacity-0'
                }`}
                style={{ 
                  animationDelay: `${index * 0.15}s`,
                  transitionDelay: `${index * 0.15}s`
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-accent to-accent-light text-white text-center py-1.5 px-5 rounded-full shadow-lg animate-bounce-slow">
                    <span className="text-xs font-bold flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>POPULER</span>
                    </span>
                  </div>
                )}
                
                {/* Icon & Title */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br ${plan.color} mb-3 shadow-lg transition-transform ${isVisible ? 'animate-rotate-in' : ''}`} style={{ animationDelay: `${(index * 0.15) + 0.1}s` }}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-neutral">{plan.description}</p>
                </div>
                
                {/* Price with Animation */}
                <div className={`mb-6 text-center border-b border-gray-200 pb-6 ${isVisible ? 'animate-zoom-in' : 'opacity-0'}`} style={{ animationDelay: `${(index * 0.15) + 0.2}s` }}>
                  <div className="flex items-baseline justify-center space-x-1 mb-1">
                    <span className="text-2xl font-bold text-primary">Rp</span>
                    <span className="text-4xl font-bold gradient-text">
                      {plan.price}
                    </span>
                  </div>
                  {plan.originalPrice && (
                    <div className="mb-2">
                      <span className="text-sm text-neutral line-through">
                        Rp {plan.originalPrice}
                      </span>
                      <span className="text-xs text-accent font-bold ml-2 inline-flex items-center space-x-1">
                        <Gift className="w-3 h-3" />
                        <span>Hemat Rp {parseInt(plan.originalPrice.replace(/\./g, '')) - parseInt(plan.price.replace(/\./g, ''))}</span>
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-neutral font-medium flex items-center justify-center space-x-1 mt-1">
                    <CreditCard className="w-3 h-3" />
                    <span>{plan.period}</span>
                  </div>
                </div>
                
                {/* Features with Animation */}
                <ul className="space-y-3 mb-6 min-h-[200px]">
                  {plan.features.map((feature, idx) => (
                    <li 
                      key={idx} 
                      className={`flex items-start space-x-2 ${
                        isVisible ? 'animate-slide-in-left' : 'opacity-0'
                      }`}
                      style={{ animationDelay: `${(index * 0.15) + (idx * 0.05) + 0.3}s` }}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <span className="text-sm text-neutral leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Note with Icon */}
                {plan.note && (
                  <div className={`mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${(index * 0.15) + 0.5}s` }}>
                    <div className="flex items-start space-x-2">
                      <BadgeIcon className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-neutral">{plan.note}</span>
                    </div>
                  </div>
                )}
                

              </div>
            )
          })}
        </div>


      </div>
    </section>
  )
}
