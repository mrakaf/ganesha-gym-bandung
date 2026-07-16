export interface LoginMemberInput {
  username: string
  password: string
}

export interface RegisterMemberInput {
  name: string
  email: string
  username: string
  password: string
}

export interface CheckMemberInput {
  email: string
  name?: string
}

