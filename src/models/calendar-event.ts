export interface CalendarListEventsQuery {
  email: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
}

export interface CalendarCreateEventInput {
  email: string
  title: string
  description?: string
  start: string
  end: string
  location?: string
  idempotencyKey?: string
}

export interface CalendarUpdateEventInput {
  email: string
  eventId: string
  title: string
  description?: string
  start: string
  end: string
  location?: string
}

export interface CalendarDeleteEventInput {
  email: string
  eventId: string
}

