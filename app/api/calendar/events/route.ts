export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { CalendarEventController } from '@/src/controllers/calendar-event-controller'

/**
 * API Route untuk fetch events dari Google Calendar
 * Endpoint: GET /api/calendar/events?timeMin=...&timeMax=...
 * 
 * Fetch events dari Google Calendar user
 */

const calendarEventController = new CalendarEventController()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  
  if (action === 'check') {
    return calendarEventController.check(request)
  }
  
  return calendarEventController.list(request)
}

