export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { CalendarEventController } from '@/src/controllers/calendar-event-controller'

/**
 * API Route untuk create event di Google Calendar
 * Endpoint: POST /api/calendar/events/create
 * 
 * Body: {
 *   title: string
 *   description?: string
 *   start: string (ISO date string)
 *   end: string (ISO date string)
 *   location?: string
 * }
 */

const calendarEventController = new CalendarEventController()

export async function POST(request: NextRequest) {
  return calendarEventController.create(request)
}

