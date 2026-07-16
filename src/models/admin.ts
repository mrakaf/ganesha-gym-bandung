export interface ListMembersQuery {
  search?: string
  filter?: string
  page?: number
  limit?: number
}

export interface ListPaymentsQuery {
  search?: string
  status?: string
  type?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  page?: string | number
  limit?: string | number
}

