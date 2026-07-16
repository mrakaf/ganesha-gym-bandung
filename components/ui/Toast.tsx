'use client'

import { useCallback, useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 text-emerald-600',
      accent: 'bg-emerald-500',
      ring: 'ring-emerald-100',
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      iconBg: 'bg-red-50 text-red-600',
      accent: 'bg-red-500',
      ring: 'ring-red-100',
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5" />,
      iconBg: 'bg-amber-50 text-amber-600',
      accent: 'bg-amber-500',
      ring: 'ring-amber-100',
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      iconBg: 'bg-blue-50 text-blue-600',
      accent: 'bg-blue-500',
      ring: 'ring-blue-100',
    },
  }[type]

  return (
    <div
      className={`relative flex items-center gap-3 pr-3 pl-0 py-3 rounded-xl bg-white border border-gray-200 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-4 ${config.ring} overflow-hidden transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />

      {/* Icon */}
      <div className={`ml-4 flex-shrink-0 w-9 h-9 rounded-lg ${config.iconBg} flex items-center justify-center`}>
        {config.icon}
      </div>

      {/* Message */}
      <p className="font-poppins text-sm font-semibold text-gray-900 flex-1 leading-snug">
        {message}
      </p>

      {/* Close */}
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }}
        className="flex-shrink-0 w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContextType {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  showToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  )
}

export function ToastContainer() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('ToastContainer must be used within ToastProvider')
  }
  const { toasts, removeToast } = context

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-[60] space-y-2 w-[calc(100%-2rem)] md:w-auto max-w-md">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

// Hook untuk menggunakan toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
