export interface GoogleAuthStartResult {
  authUrl: string
}

export interface GoogleAuthCallbackInput {
  code?: string | null
  error?: string | null
}

