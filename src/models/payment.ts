export type PaymentType = 'VISIT' | 'MEMBERSHIP_NEW' | 'MEMBERSHIP_RENEWAL'
export type CheckoutMethod = 'qris' | 'cash'

export interface CreateCheckoutInput {
  paymentType: PaymentType
  amount: number
  userEmail: string
  /** Nama untuk member baru otomatis saat email belum ada di DB */
  userName?: string
  checkoutMethod?: string
}

