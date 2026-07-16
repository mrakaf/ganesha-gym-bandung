export interface UpdateMemberProfileInput {
  name?: string
  phone?: string
  height?: number
  weight?: number
  gymExperienceMonths?: number
  experienceLevel?: 'PEMULA' | 'MENENGAH' | 'ADVANCED'
  gender?: 'PRIA' | 'WANITA' | 'LAINNYA'
  dateOfBirth?: Date | string
  age?: number
}

export interface MemberProfileQuery {
  email?: string | null
  username?: string | null
}

