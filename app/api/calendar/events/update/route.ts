export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { CalendarEventController } from '@/src/controllers/calendar-event-controller'

/**
 * API Route untuk update event di Google Calendar
 * Endpoint: PUT /api/calendar/events/update
 * 
 * Body: {
 *   eventId: string
 *   title: string
 *   description?: string
 *   start: string (ISO date string)
 *   end: string (ISO date string)
 *   location?: string
 * }
 */

const calendarEventController = new CalendarEventController()

export async function PUT(request: NextRequest) {
  return calendarEventController.update(request)
}

