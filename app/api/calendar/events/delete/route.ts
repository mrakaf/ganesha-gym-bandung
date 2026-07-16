import { NextRequest } from 'next/server'
import { CalendarEventController } from '@/src/controllers/calendar-event-controller'

/**
 * API Route untuk delete event di Google Calendar
 * Endpoint: DELETE /api/calendar/events/delete?eventId=xxx
 */

const calendarEventController = new CalendarEventController()

export async function DELETE(request: NextRequest) {
  return calendarEventController.remove(request)
}

