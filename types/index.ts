// Type definitions untuk project Ganesha Gym

export type UserRole = 'ADMIN' | 'STAFF'

export type PaymentType = 
  | 'VISIT' 
  | 'MEMBERSHIP_NEW' 
  | 'MEMBERSHIP_RENEWAL' 
  | 'PERSONAL_TRAINER'

export type PaymentStatus = 
  | 'PENDING' 
  | 'PAID' 
  | 'FAILED' 
  | 'CANCELLED'

export type ReminderType = 
  | 'EXPIRING_H3' 
  | 'EXPIRING_H1' 
  | 'EXPIRED' 
  | 'OVERDUE_H3'

