export const dynamic = 'force-dynamic';
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getMemberSession, type MemberSession } from '@/lib/member-session'
import { CreditCard, CheckCircle2, AlertCircle, Loader2, RefreshCw, QrCode, ShieldCheck, Sparkles, Star, Receipt, Wallet, BadgeCheck, Copy, Check, Banknote, Smartphone, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface PaymentOption {
  id: string
  type: 'VISIT' | 'MEMBERSHIP_NEW' | 'MEMBERSHIP_RENEWAL'
  name: string
  price: number
  description: string
  features: string[]
  isHidden?: boolean
  disabled?: boolean
  disabledReason?: string
}

interface PaymentHistoryItem {
  id: string
  type: 'VISIT' | 'MEMBERSHIP_NEW' | 'MEMBERSHIP_RENEWAL'
  amount: number
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'
  paymentMethod: string | null
  orderId: string | null
  description: string | null
  paidAt: string | null
  createdAt: string
}

const paymentOptions: PaymentOption[] = [
  {
    id: 'visit',
    type: 'VISIT',
    name: 'Visit',
    price: 25000,
    description: 'Bayar per kunjungan',
    features: [
      'Akses gym 1 kali',
      'Semua fasilitas tersedia',
      'Tidak perlu kartu member',
    ],
  },
  {
    id: 'membership-new',
    type: 'MEMBERSHIP_NEW',
    name: 'Member Baru',
    price: 200000,
    description: 'Pendaftaran member baru + kartu member',
    features: [
      'Kartu member eksklusif',
      'Akses gym 1 bulan penuh',
      'Semua fasilitas tersedia',
      'Parkir gratis',
      'Rincian: Membership Rp160.000 + Kartu Rp40.000',
    ],
  },
  {
    id: 'membership-renewal',
    type: 'MEMBERSHIP_RENEWAL',
    name: 'Perpanjangan Member',
    price: 160000,
    description: 'Perpanjang membership Anda',
    features: [
      'Akses gym 1 bulan penuh',
      'Semua fasilitas tersedia',
      'Parkir gratis',
      'Prioritas booking',
    ],
  },
]

export default function PaymentPage() {
  const { user } = useAuth()
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null)
  const { success, error: showError, info } = useToast()
  const identityEmail = user?.email || memberSession?.email || null
  const identityName = user?.displayName || memberSession?.name || memberSession?.username || identityEmail || 'Customer'

  useEffect(() => {
    setMemberSession(getMemberSession())
  }, [])

  const [selectedOption, setSelectedOption] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'pending'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [currentAmount, setCurrentAmount] = useState<number | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [qrString, setQrString] = useState<string | null>(null)
  const [expiredAt, setExpiredAt] = useState<string | null>(null)
  const [qrStartedAt, setQrStartedAt] = useState<number | null>(null)
  const [nowTimestamp, setNowTimestamp] = useState(Date.now())
  const [hasMembershipHistory, setHasMembershipHistory] = useState(false)
  const [mustPayRegistrationFee, setMustPayRegistrationFee] = useState(false)
  const [isActiveMember, setIsActiveMember] = useState(false)
  const [loadingEligibility, setLoadingEligibility] = useState(true)
  const [lastSuccessfulPaymentType, setLastSuccessfulPaymentType] = useState<PaymentOption['type'] | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [copiedOrderId, setCopiedOrderId] = useState(false)
  const [checkoutMethod, setCheckoutMethod] = useState<'qris' | 'cash'>('qris')
  const [activeCheckout, setActiveCheckout] = useState<'qris' | 'cash' | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPaymentPoll = () => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => clearPaymentPoll(), [])

  const notifyPremiumAccessUpdated = () => {
    window.dispatchEvent(new Event('premium-access-updated'))
  }

  useEffect(() => {
    if (!expiredAt || paymentStatus !== 'pending') return
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [expiredAt, paymentStatus])

  useEffect(() => {
    const loadPaymentEligibility = async () => {
      if (!identityEmail) {
        setLoadingEligibility(false)
        return
      }
      try {
        const response = await fetch(`/api/members/profile?email=${encodeURIComponent(identityEmail)}`)
        if (!response.ok) throw new Error('Gagal memuat data member')
        const data = await response.json()
        const hasHistory = !!data?.member?.hasMembershipHistory
        const needRegistration = !!data?.member?.mustPayRegistrationFee
        const active = !!data?.member?.isActive
        
        setHasMembershipHistory(hasHistory)
        setMustPayRegistrationFee(needRegistration)
        setIsActiveMember(active)

        setSelectedOption((prev) => {
          if (prev === 'membership-renewal' && (!hasHistory || needRegistration)) return ''
          if (prev === 'membership-new' && hasHistory && !needRegistration) return ''
          return prev
        })
      } catch (error) {
        setHasMembershipHistory(false)
      } finally {
        setLoadingEligibility(false)
      }
    }

    loadPaymentEligibility()
  }, [identityEmail, paymentStatus])

  useEffect(() => {
    const loadPaymentHistory = async () => {
      if (!identityEmail) {
        setLoadingHistory(false)
        return
      }
      try {
        const response = await fetch(`/api/payments/history?email=${encodeURIComponent(identityEmail)}`)
        if (!response.ok) throw new Error('Gagal memuat history pembayaran')
        const data = await response.json()
        setPaymentHistory(data?.payments || [])
      } catch (error) {
        setPaymentHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    loadPaymentHistory()
  }, [identityEmail, paymentStatus])

  const remainingTimeLabel = useMemo(() => {
    if (!expiredAt) return null
    const diff = new Date(expiredAt).getTime() - nowTimestamp
    if (Number.isNaN(diff) || diff <= 0) return 'Kedaluwarsa'
    const minutes = Math.floor(diff / 1000 / 60)
    const seconds = Math.floor((diff / 1000) % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [expiredAt, nowTimestamp])

  const remainingProgressPercent = useMemo(() => {
    if (!expiredAt || !qrStartedAt) return null
    const end = new Date(expiredAt).getTime()
    const total = end - qrStartedAt
    const remain = end - nowTimestamp
    if (!Number.isFinite(total) || total <= 0) return null
    const raw = (remain / total) * 100
    return Math.max(0, Math.min(100, raw))
  }, [expiredAt, qrStartedAt, nowTimestamp])

  const prevToastPaymentStatusRef = useRef(paymentStatus)
  useEffect(() => {
    const prev = prevToastPaymentStatusRef.current
    if (paymentStatus === 'success' && prev !== 'success') {
      success('Pembayaran berhasil! Akses premium sudah dibuka.')
    }
    if (paymentStatus === 'failed' && prev !== 'failed') {
      showError('Pembayaran gagal. Silakan ulangi transaksi.')
    }
    prevToastPaymentStatusRef.current = paymentStatus
  }, [paymentStatus, success, showError])

  const displayMethod =
    (paymentStatus === 'pending' || paymentStatus === 'success') && activeCheckout
      ? activeCheckout
      : checkoutMethod

  const copyOrderId = async () => {
    if (!currentOrderId) return
    try {
      await navigator.clipboard.writeText(currentOrderId)
      setCopiedOrderId(true)
      info('Order ID berhasil disalin')
      setTimeout(() => setCopiedOrderId(false), 1500)
    } catch {
      showError('Gagal menyalin Order ID')
    }
  }

  const handlePayment = async () => {
    if (!selectedOption) {
      alert('Pilih paket pembayaran terlebih dahulu')
      return
    }

    if (!identityEmail) {
      alert('Anda harus login terlebih dahulu')
      return
    }

    setLoading(true)
    setPaymentStatus('processing')
    setErrorMessage('')

    try {
      const selectedPayment = paymentOptionsWithEligibility.find(opt => opt.id === selectedOption)
      if (!selectedPayment) {
        throw new Error('Paket pembayaran tidak valid')
      }
      if (selectedPayment.disabled) {
        throw new Error(selectedPayment.disabledReason || 'Paket ini belum tersedia untuk akun Anda')
      }

      // Create payment transaction
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentType: selectedPayment.type,
          amount: selectedPayment.price,
          userEmail: identityEmail,
          userName: identityName,
          checkoutMethod,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal membuat transaksi pembayaran')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error('Response pembayaran tidak valid')
      }

      const method = data.paymentMethod === 'cash' ? 'cash' : 'qris'
      setActiveCheckout(method)

      if (method === 'qris') {
        if (!data.qrString) {
          throw new Error('Data QRIS tidak valid')
        }
        setQrString(data.qrString)
        setExpiredAt(data.expiredAt || null)
        setQrStartedAt(Date.now())
      } else {
        setQrString(null)
        setExpiredAt(null)
        setQrStartedAt(null)
        info(
          'Pesanan tunai dibuat. Silakan bayar di kasir — staff akan mengonfirmasi setelah pembayaran diterima.'
        )
      }

      setCurrentOrderId(data.orderId)
      setCurrentAmount(data.amount)
      setPaymentStatus('pending')
      setLoading(false)
      startStatusPolling(data.orderId, data.amount, method)
    } catch (error: any) {
      console.error('Error processing payment:', error)
      setPaymentStatus('failed')
      setErrorMessage(error.message || 'Gagal memproses pembayaran. Silakan coba lagi.')
      setLoading(false)
    }
  }

  // Function untuk check payment status
  const checkPaymentStatus = async (orderId: string, amount: number) => {
    try {
      setCheckingStatus(true)
      const response = await fetch(`/api/payments/status?orderId=${orderId}&amount=${amount}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Status check failed:', errorData)
        throw new Error(errorData.error || 'Gagal mengecek status pembayaran')
      }

      const data = await response.json()
      console.log('✅ Payment status response:', {
        orderId: data.orderId,
        status: data.status,
        message: data.message,
      })
      
      setPaymentDetails(data)

      // Update payment status berdasarkan response
      if (data.status === 'success') {
        clearPaymentPoll()
        setPaymentStatus('success')
        setErrorMessage('') // Clear error jika success
        setLastSuccessfulPaymentType(data.orderId?.includes('MEMBERSHIP_NEW') ? 'MEMBERSHIP_NEW' : data.orderId?.includes('MEMBERSHIP_RENEWAL') ? 'MEMBERSHIP_RENEWAL' : data.orderId?.includes('VISIT') ? 'VISIT' : null)
        notifyPremiumAccessUpdated()
      } else if (data.status === 'failed') {
        clearPaymentPoll()
        setPaymentStatus('failed')
        setActiveCheckout(null)
        setErrorMessage(data.message || 'Pembayaran gagal')
      } else {
        setPaymentStatus('pending')
        // Jangan set error message untuk pending
      }
    } catch (error: any) {
      console.error('❌ Error checking payment status:', error)
      setErrorMessage(error.message || 'Gagal mengecek status pembayaran')
    } finally {
      setCheckingStatus(false)
    }
  }

  // Function untuk start polling status (check setiap 5 detik)
  const startStatusPolling = (orderId: string, amount: number, mode: 'qris' | 'cash') => {
    clearPaymentPoll()
    let pollCount = 0
    const maxPolls = mode === 'cash' ? 240 : 60 // tunai hingga ±20 menit polling

    pollRef.current = setInterval(async () => {
      pollCount++
      try {
        setCheckingStatus(true)
        const response = await fetch(`/api/payments/status?orderId=${orderId}&amount=${amount}`)

        if (response.ok) {
          const data = await response.json()
          setPaymentDetails(data)

          if (data.status === 'success') {
            setPaymentStatus('success')
            setLastSuccessfulPaymentType(
              data.orderId?.includes('MEMBERSHIP_NEW')
                ? 'MEMBERSHIP_NEW'
                : data.orderId?.includes('MEMBERSHIP_RENEWAL')
                  ? 'MEMBERSHIP_RENEWAL'
                  : data.orderId?.includes('VISIT')
                    ? 'VISIT'
                    : null
            )
            notifyPremiumAccessUpdated()
            clearPaymentPoll()
            setCheckingStatus(false)
            setTimeout(() => {
              setPaymentStatus('idle')
              setSelectedOption('')
              setCurrentOrderId(null)
              setCurrentAmount(null)
              setQrString(null)
              setExpiredAt(null)
              setQrStartedAt(null)
              setPaymentDetails(null)
              setActiveCheckout(null)
              setCheckoutMethod('qris')
            }, 5000)
          } else if (data.status === 'failed') {
            setPaymentStatus('failed')
            setErrorMessage(data.message || 'Pembayaran gagal')
            clearPaymentPoll()
            setCheckingStatus(false)
            setActiveCheckout(null)
          } else {
            setCheckingStatus(false)
          }
        } else {
          setCheckingStatus(false)
        }
      } catch (error) {
        console.error('❌ Error polling payment status:', error)
        setCheckingStatus(false)
      }

      if (pollCount >= maxPolls) {
        clearPaymentPoll()
        setCheckingStatus(false)
      }
    }, 5000)
  }

  const paymentOptionsWithEligibility = paymentOptions.map((option) => {
    // 1. Logika Member Aktif (sudah bayar member dan tidak kena sanksi > 7 hari)
    if (isActiveMember && hasMembershipHistory) {
      if (option.type === 'VISIT' || option.type === 'MEMBERSHIP_NEW') {
        return {
          ...option,
          isHidden: true,
          disabled: true,
        }
      }
      return {
        ...option,
        isHidden: false,
        disabled: false,
      }
    }

    // 2. Logika Member Nonaktif / Pengunjung Baru
    if (option.type === 'MEMBERSHIP_NEW') {
      const isAlreadyMember = hasMembershipHistory && !mustPayRegistrationFee
      return {
        ...option,
        disabled: isAlreadyMember,
        isHidden: isAlreadyMember,
        disabledReason: isAlreadyMember
          ? 'Akun ini sudah pernah membership. Gunakan paket Perpanjangan Member (Rp 160.000).'
          : '',
      }
    }

    if (option.type === 'MEMBERSHIP_RENEWAL') {
      const cannotRenew = !hasMembershipHistory || mustPayRegistrationFee
      return {
        ...option,
        disabled: cannotRenew,
        isHidden: !hasMembershipHistory, // Sembunyikan perpanjangan jika benar-benar baru
        disabledReason: cannotRenew
          ? mustPayRegistrationFee
            ? 'Membership Anda lewat lebih dari 7 hari. Akun dinonaktifkan dan wajib registrasi ulang paket Member Baru (Rp 200.000).'
            : 'Paket ini hanya untuk member yang sudah pernah daftar.'
          : '',
      }
    }

    // VISIT selalu muncul untuk nonaktif
    return { ...option, disabled: false, isHidden: false, disabledReason: '' }
  }).filter(opt => !opt.isHidden)

  useEffect(() => {
    if (loadingEligibility || selectedOption) return
    
    if (isActiveMember && hasMembershipHistory) {
      setSelectedOption('membership-renewal')
    } else if (mustPayRegistrationFee || !hasMembershipHistory) {
      setSelectedOption('membership-new')
    } else {
      setSelectedOption('visit')
    }
  }, [hasMembershipHistory, mustPayRegistrationFee, isActiveMember, loadingEligibility, selectedOption])

  useEffect(() => {
    if (paymentStatus !== 'success' || !lastSuccessfulPaymentType) return
    if (lastSuccessfulPaymentType === 'MEMBERSHIP_NEW') {
      setHasMembershipHistory(true)
      setSelectedOption('membership-renewal')
    }
  }, [paymentStatus, lastSuccessfulPaymentType])

  const selectedPayment = paymentOptionsWithEligibility.find(opt => opt.id === selectedOption)
  const paymentTypeLabel: Record<PaymentHistoryItem['type'], string> = {
    VISIT: 'Visit',
    MEMBERSHIP_NEW: 'Member Baru',
    MEMBERSHIP_RENEWAL: 'Perpanjangan Member',
  }
  const paymentStatusLabel: Record<PaymentHistoryItem['status'], { text: string; className: string }> = {
    PENDING: { text: 'Menunggu', className: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40' },
    PAID: { text: 'Berhasil', className: 'text-green-300 bg-green-500/20 border-green-500/40' },
    FAILED: { text: 'Gagal', className: 'text-red-300 bg-red-500/20 border-red-500/40' },
    CANCELLED: { text: 'Dibatalkan', className: 'text-gray-300 bg-gray-500/20 border-gray-500/40' },
  }
  const paymentTypeIcon: Record<PaymentHistoryItem['type'], JSX.Element> = {
    VISIT: <Wallet className="w-4 h-4 text-sky-300" />,
    MEMBERSHIP_NEW: <BadgeCheck className="w-4 h-4 text-emerald-300" />,
    MEMBERSHIP_RENEWAL: <Receipt className="w-4 h-4 text-violet-300" />,
  }

  const formatPaymentMethodLabel = (m: string | null | undefined) => {
    if (!m) return '-'
    const x = m.toLowerCase()
    if (x === 'cash') return 'Tunai'
    if (x === 'qris') return 'QRIS'
    return m
  }

  const checkoutLocked =
    paymentStatus === 'pending' || paymentStatus === 'processing'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-white/15 bg-gradient-to-r from-white/10 via-white/5 to-accent/10 p-6 backdrop-blur-xl">
        <div className="inline-flex items-center space-x-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 mb-3">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs uppercase tracking-wide text-accent font-poppins">Checkout Gym</span>
        </div>
        <h1 className="text-4xl font-oswald font-bold text-white mb-2">
          Pembayaran
        </h1>
        <p className="text-gray-300 font-poppins max-w-xl">
          Pilih paket, lalu bayar pakai QRIS atau tunai di kasir. Untuk QRIS status berubah otomatis; untuk tunai
          staff akan mengonfirmasi setelah pembayaran diterima di gym.
        </p>
      </div>

      {/* Payment Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {paymentOptionsWithEligibility.map((option) => (
          <div
            key={option.id}
            onClick={() => {
              if (!option.disabled) setSelectedOption(option.id)
            }}
            className={`relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 cursor-pointer transition-all ${
              selectedOption === option.id
                ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                : 'border-white/20 hover:border-accent/50 hover:bg-white/15'
            } ${option.disabled ? 'opacity-55 cursor-not-allowed border-dashed' : ''}`}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-oswald font-bold text-white">
                {option.name}
              </h3>
              {!option.disabled && (
                (isActiveMember && hasMembershipHistory && option.type === 'MEMBERSHIP_RENEWAL') || 
                (mustPayRegistrationFee && option.type === 'MEMBERSHIP_NEW') ||
                (!hasMembershipHistory && option.type === 'MEMBERSHIP_NEW')
              ) && (
                <span className="inline-flex items-center space-x-1 rounded-full bg-accent/20 px-2 py-1 text-[10px] font-semibold text-accent">
                  <Star className="w-3 h-3" />
                  <span>Direkomendasikan</span>
                </span>
              )}
              {selectedOption === option.id && (
                <CheckCircle2 className="w-6 h-6 text-accent" />
              )}
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-oswald font-bold text-accent mb-1">
                Rp {option.price.toLocaleString('id-ID')}
              </div>
              <p className="text-gray-300 text-sm font-poppins">
                {option.description}
              </p>
              {option.disabledReason && (
                <p className="text-yellow-300 text-xs font-poppins mt-2">
                  {option.disabledReason}
                </p>
              )}
            </div>

            <ul className="space-y-2 mb-4">
              {option.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2 text-gray-300 text-sm font-poppins">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment Summary & Action */}
      {!loadingEligibility && (
        <div className="mb-6 rounded-xl border border-white/20 bg-white/10 p-4">
          <p className="text-sm text-gray-200 font-poppins">
            {isActiveMember && hasMembershipHistory
              ? 'Anda adalah member aktif. Silakan pilih paket Perpanjangan Member untuk menambah masa aktif.'
              : mustPayRegistrationFee
              ? 'Membership Anda sudah lewat lebih dari 7 hari. Akun dinonaktifkan sementara, silakan registrasi ulang paket Member Baru (Rp 200.000).'
              : hasMembershipHistory
              ? 'Akun ini sudah pernah membership. Gunakan paket Perpanjangan Member (Rp 160.000).'
              : 'Akun ini belum pernah membership. Silakan pilih paket Member Baru (Rp 200.000).'}
          </p>
        </div>
      )}

      {selectedOption && selectedPayment && !selectedPayment.disabled && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
          <div className="px-6 md:px-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className={`rounded-xl border px-4 py-3 ${selectedOption ? 'border-accent/50 bg-accent/10' : 'border-white/15 bg-white/5'}`}>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Step 1</p>
                <p className="text-sm text-white font-semibold">Pilih Paket</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${paymentStatus === 'pending' || paymentStatus === 'success' ? 'border-yellow-400/40 bg-yellow-500/10' : 'border-white/15 bg-white/5'}`}>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Step 2</p>
                <p className="text-sm text-white font-semibold">
                  {displayMethod === 'cash' ? 'Bayar di kasir' : 'Scan QRIS'}
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${paymentStatus === 'success' ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/15 bg-white/5'}`}>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Step 3</p>
                <p className="text-sm text-white font-semibold">Verifikasi Pembayaran</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="lg:col-span-3 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-accent/20 p-2">
                    <CreditCard className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-oswald font-bold text-white">Checkout Pembayaran</h2>
                    <p className="text-xs text-gray-300 font-poppins">Satu langkah lagi untuk mengaktifkan akses premium</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Aman
                </span>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/10 p-4 md:p-5 mb-5">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
                  <div>
                    <p className="text-xs text-gray-400 font-poppins">Paket Dipilih</p>
                    <p className="text-lg text-white font-semibold font-poppins">{selectedPayment.name}</p>
                  </div>
                  <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    displayMethod === 'cash'
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                      : 'border-accent/40 bg-accent/15 text-accent'
                  }`}
                >
                  {displayMethod === 'cash' ? 'Tunai' : 'QRIS'}
                </span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <p className="text-sm text-gray-300 font-poppins">Total Pembayaran</p>
                  <p className="text-3xl font-oswald font-bold text-accent">Rp {selectedPayment.price.toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3 font-poppins">
                  Metode pembayaran
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={checkoutLocked}
                    onClick={() => setCheckoutMethod('qris')}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${
                      checkoutMethod === 'qris'
                        ? 'border-cyan-400/60 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    } ${checkoutLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-cyan-500/20 p-2.5">
                        <Smartphone className="w-5 h-5 text-cyan-200" />
                      </div>
                      <div>
                        <p className="font-oswald font-bold text-white">QRIS</p>
                        <p className="text-xs text-gray-400 font-poppins mt-0.5 leading-snug">
                          Scan QR, verifikasi otomatis oleh sistem
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLocked}
                    onClick={() => setCheckoutMethod('cash')}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${
                      checkoutMethod === 'cash'
                        ? 'border-amber-400/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    } ${checkoutLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-500/20 p-2.5">
                        <Banknote className="w-5 h-5 text-amber-200" />
                      </div>
                      <div>
                        <p className="font-oswald font-bold text-white">Tunai di gym</p>
                        <p className="text-xs text-gray-400 font-poppins mt-0.5 leading-snug">
                          Bayar ke kasir, tunggu konfirmasi pengelola
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <div className="flex items-center space-x-2 text-red-300">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-poppins text-sm">{errorMessage}</span>
                  </div>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                  <div className="flex items-center space-x-2 text-green-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-poppins font-semibold">Pembayaran berhasil! Akses premium sudah dibuka.</span>
                  </div>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <div className="flex items-center space-x-2 text-red-300">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-poppins font-semibold">Pembayaran gagal. Silakan ulangi transaksi.</span>
                  </div>
                </div>
              )}

              {paymentDetails && paymentStatus === 'success' && (
                <div className="mb-4 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
                  <div className="space-y-1.5 text-emerald-200 text-sm font-poppins">
                    <p><strong>Order ID:</strong> <span className="font-mono">{paymentDetails.orderId}</span></p>
                    <p><strong>Metode:</strong> {paymentDetails.paymentType || '-'}</p>
                    <p><strong>Jumlah:</strong> Rp {paymentDetails.grossAmount?.toLocaleString('id-ID') || '-'}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={
                  loading ||
                  paymentStatus === 'processing' ||
                  (paymentStatus === 'pending' && !!currentOrderId)
                }
                className={`w-full font-poppins font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  checkoutMethod === 'cash'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:shadow-xl hover:shadow-amber-500/25'
                    : 'bg-gradient-to-r from-accent to-accent-light text-white hover:shadow-xl hover:shadow-accent/30'
                }`}
              >
                {loading || paymentStatus === 'processing' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Membuat transaksi...</span>
                  </>
                ) : (
                  <>
                    {checkoutMethod === 'cash' ? (
                      <Banknote className="w-5 h-5" />
                    ) : (
                      <CreditCard className="w-5 h-5" />
                    )}
                    <span>
                      {paymentStatus === 'pending' && currentOrderId ? 'Menunggu pembayaran...' : 'Lanjutkan Pembayaran'}
                    </span>
                  </>
                )}
              </button>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {checkoutMethod === 'qris' ? (
                  <>
                    <div className="rounded-lg border border-white/15 bg-white/5 p-3 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-gray-300 text-xs font-poppins">QRIS diproses aman melalui PaKasir</p>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-white/5 p-3 flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 text-sky-400 shrink-0" />
                      <p className="text-gray-300 text-xs font-poppins">Status menyala otomatis setelah transfer masuk</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 flex items-center space-x-2">
                      <Banknote className="w-4 h-4 text-amber-300 shrink-0" />
                      <p className="text-gray-300 text-xs font-poppins">
                        Tunjukkan kode pesanan kepada staff pada saat membayar di kasir gym
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-white/5 p-3 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-200 shrink-0" />
                      <p className="text-gray-300 text-xs font-poppins">
                        Akses diaktivasi ketika pembayaran sudah dikonfirmasi pengelola
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 p-6 md:p-8 bg-gradient-to-b from-white/5 to-black/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-oswald text-xl font-bold">
                  {displayMethod === 'cash' ? 'Pembayaran tunai' : 'QRIS'}
                </h3>
                {paymentStatus === 'pending' && (
                  <span className="rounded-full border border-yellow-400/40 bg-yellow-500/10 px-2.5 py-1 text-[11px] text-yellow-300 font-semibold">
                    Menunggu
                  </span>
                )}
              </div>

              {paymentStatus === 'pending' && activeCheckout === 'cash' ? (
                <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-b from-amber-500/15 to-black/20 p-5 shadow-inner">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="rounded-xl bg-amber-500/25 p-2">
                      <Banknote className="w-6 h-6 text-amber-100" />
                    </div>
                    <div>
                      <p className="text-white font-oswald font-bold text-lg">Langkah pembayaran tunai</p>
                      <ol className="mt-3 space-y-2 text-sm text-amber-100/90 font-poppins list-decimal list-inside">
                        <li>Kunjungi loket atau kasir Ganesha Gym.</li>
                        <li>Berikan <strong>kode pesanan</strong> di bawah dan bayar nominal yang tertera.</li>
                        <li>Tunggu staff menekan konfirmasi — halaman ini ter-update otomatis.</li>
                      </ol>
                    </div>
                  </div>
                  {currentOrderId && (
                    <div className="rounded-xl border border-amber-400/40 bg-black/30 p-4 mb-4">
                      <p className="text-[11px] uppercase tracking-wider text-amber-200/70 font-semibold mb-2">
                        Kode pesanan
                      </p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-mono text-sm text-amber-50 break-all">{currentOrderId}</p>
                        <button
                          type="button"
                          onClick={copyOrderId}
                          className="inline-flex items-center space-x-1 text-[11px] px-3 py-1.5 rounded-lg border border-amber-400/45 text-amber-100 hover:bg-amber-500/20 transition-colors shrink-0"
                        >
                          {copiedOrderId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedOrderId ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-amber-200/80 font-poppins mt-3">
                        Total bayar di kasir:{' '}
                        <strong className="text-white">
                          Rp {(currentAmount ?? selectedPayment.price).toLocaleString('id-ID')}
                        </strong>
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => currentOrderId && currentAmount && checkPaymentStatus(currentOrderId, currentAmount)}
                    disabled={checkingStatus || !currentAmount}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/45 rounded-xl text-amber-100 font-poppins text-sm transition-all disabled:opacity-50"
                  >
                    {checkingStatus ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengecek status...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Periksa apakah sudah dikonfirmasi</span>
                      </>
                    )}
                  </button>
                </div>
              ) : paymentStatus !== 'pending' || !qrString ? (
                <div className="h-full min-h-[340px] rounded-2xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center text-center p-6">
                  {checkoutMethod === 'cash' ? (
                    <>
                      <Banknote className="w-12 h-12 text-amber-300/70 mb-3" />
                      <p className="text-gray-300 font-poppins text-sm">
                        Pilih metode tunai, lalu ketuk <strong>Lanjutkan Pembayaran</strong> untuk membuat pesanan tunai dan instruksi di sini.
                      </p>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-gray-300 font-poppins text-sm">
                        QRIS akan muncul setelah Anda mengetuk <strong>Lanjutkan Pembayaran</strong>.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <div className="rounded-xl bg-white p-4 mb-4 shadow-lg shadow-black/20">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`}
                      alt="QRIS Payment"
                      className="w-full max-w-[300px] mx-auto aspect-square"
                    />
                  </div>
                  {currentOrderId && (
                    <div className="mb-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-yellow-200 text-xs font-poppins">
                          Order ID: <span className="font-mono">{currentOrderId}</span>
                        </p>
                        <button
                          onClick={copyOrderId}
                          className="inline-flex items-center space-x-1 text-[11px] px-2 py-1 rounded border border-yellow-400/40 text-yellow-100 hover:bg-yellow-500/20 transition-colors"
                        >
                          {copiedOrderId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedOrderId ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {expiredAt && (
                    <p className="text-yellow-200 text-xs font-poppins mb-1">
                      Berlaku sampai: {new Date(expiredAt).toLocaleString('id-ID')}
                    </p>
                  )}
                  {remainingTimeLabel && (
                    <p className="text-yellow-100 text-sm font-semibold font-poppins mb-3">
                      Sisa waktu: {remainingTimeLabel}
                    </p>
                  )}
                  {remainingProgressPercent !== null && (
                    <div className="mb-3">
                      <div className="h-2 w-full rounded-full bg-yellow-900/40 overflow-hidden border border-yellow-500/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-400 transition-all duration-1000"
                          style={{ width: `${remainingProgressPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-yellow-200/90 font-poppins">
                        Progress masa berlaku QRIS: {Math.round(remainingProgressPercent)}%
                      </p>
                    </div>
                  )}
                  {paymentDetails && (
                    <p className="text-yellow-200 text-xs font-poppins mb-3">
                      Status: {paymentDetails.message}
                    </p>
                  )}
                  <button
                    onClick={() => currentOrderId && currentAmount && checkPaymentStatus(currentOrderId, currentAmount)}
                    disabled={checkingStatus || !currentAmount}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-200 font-poppins text-sm transition-all disabled:opacity-50"
                  >
                    {checkingStatus ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengecek status...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Cek Status Pembayaran</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-oswald font-bold text-white mb-4">
          Informasi Pembayaran
        </h2>
        <div className="space-y-3 text-gray-300 font-poppins text-sm">
          <p>
            • <strong className="text-white">Visit (Rp 25.000):</strong> Pembayaran per kunjungan, 
            tidak perlu kartu member.
          </p>
          <p>
            • <strong className="text-white">Member Baru (Rp 200.000):</strong> Termasuk kartu member 
            (Rp 40.000) + membership 1 bulan (Rp 160.000).
          </p>
          <p>
            • <strong className="text-white">Perpanjangan (Rp 160.000):</strong> Untuk member yang 
            ingin memperpanjang membership.
          </p>
          <p>
            • <strong className="text-white">QRIS:</strong> scan dari e-wallet atau mobile banking; status sukses/gagal akan
            diketahui secara otomatis.
          </p>
          <p>
            • <strong className="text-white">Tunai:</strong> buat pesanan di website, bayar nominal yang sama di kasir gym;
            akses baru aktif setelah pengelola mengonfirmasi pembayaran.
          </p>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mt-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-oswald font-bold text-white flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-accent" />
              <span>Riwayat Pembayaran</span>
            </h2>
            <p className="text-xs text-gray-300 font-poppins mt-1">Data transaksi real milik akun Anda</p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-gray-200 font-poppins">
            {paymentHistory.length} transaksi
          </span>
        </div>
        {loadingHistory ? (
          <div className="flex items-center space-x-3 rounded-xl border border-white/10 bg-white/5 p-4 text-gray-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-poppins">Memuat riwayat pembayaran terbaru...</span>
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
            <p className="text-gray-300 text-sm font-poppins">Belum ada riwayat pembayaran.</p>
            <p className="text-gray-500 text-xs font-poppins mt-1">Transaksi Anda akan tampil otomatis setelah pembayaran dibuat.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="rounded-xl border border-white/15 bg-gradient-to-r from-white/10 to-white/5 p-4 hover:border-accent/40 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-poppins font-semibold flex items-center space-x-2">
                      {paymentTypeIcon[payment.type]}
                      <span>{paymentTypeLabel[payment.type]} - Rp {payment.amount.toLocaleString('id-ID')}</span>
                    </p>
                    <p className="text-gray-400 text-xs font-poppins mt-2">
                      Order: {payment.orderId || '-'}
                    </p>
                    <p className="text-gray-500 text-xs font-poppins mt-1">
                      Metode: {formatPaymentMethodLabel(payment.paymentMethod)}
                    </p>
                    <p className="text-gray-400 text-xs font-poppins mt-1">
                      Dibuat: {new Date(payment.createdAt).toLocaleString('id-ID')}
                    </p>
                    {payment.paidAt && (
                      <p className="text-gray-400 text-xs font-poppins mt-1">
                        Dibayar: {new Date(payment.paidAt).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-poppins font-semibold ${paymentStatusLabel[payment.status].className}`}
                  >
                    {paymentStatusLabel[payment.status].text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
