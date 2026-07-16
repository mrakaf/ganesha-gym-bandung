export interface PasswordResetLinkRequestInput {
  email?: string
  origin: string
}

export interface PasswordResetInput {
  token: string
  password: string
}

