import { NextRequest } from 'next/server'
import { AppError } from '@/src/models/app-error'
import { GoogleCalendarService } from '@/src/services/google-calendar-service'
import { BaseController } from '@/src/controllers/base-controller'
import {
  CalendarCreateEventInput,
  CalendarDeleteEventInput,
  CalendarListEventsQuery,
  CalendarUpdateEventInput,
} from '@/src/models/calendar-event'

export class CalendarEventController extends BaseController {
  constructor(private readonly calendarService: GoogleCalendarService = new GoogleCalendarService()) {
    super()
  }

  async list(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const query: CalendarListEventsQuery = {
        email: searchParams.get('email') || '',
        timeMin: searchParams.get('timeMin') || undefined,
        timeMax: searchParams.get('timeMax') || undefined,
        maxResults: parseInt(searchParams.get('maxResults') || '50'),
      }
      const events = await this.calendarService.listEvents(query)
      return this.json({ success: true, events, count: events.length })
    } catch (error: any) {
      return this.handleCalendarError(error, 'Error fetching Google Calendar events:', 'Gagal mengambil events dari Google Calendar')
    }
  }

  async check(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const email = searchParams.get('email') || ''
      const connected = await this.calendarService.checkConnection(email)
      return this.json({ success: true, connected })
    } catch (error: any) {
      return this.handleCalendarError(error, 'Error checking Google Calendar connection:', 'Gagal memeriksa koneksi Google Calendar')
    }
  }

  async create(request: NextRequest) {
    try {
      const body = (await request.json()) as CalendarCreateEventInput
      const result = await this.calendarService.createEvent(body)
      return this.json({ success: true, duplicate: result.duplicate, event: result.event })
    } catch (error: any) {
      return this.handleCalendarError(error, 'Error creating Google Calendar event:', 'Gagal membuat event di Google Calendar')
    }
  }

  async update(request: NextRequest) {
    try {
      const body = (await request.json()) as CalendarUpdateEventInput
      const event = await this.calendarService.updateEvent(body)
      return this.json({ success: true, event })
    } catch (error: any) {
      if (error?.code === 404) {
        return this.json({ error: 'Event tidak ditemukan di Google Calendar' }, { status: 404 })
      }
      return this.handleCalendarError(error, 'Error updating Google Calendar event:', 'Gagal mengupdate event di Google Calendar')
    }
  }

  async remove(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const payload: CalendarDeleteEventInput = {
        email: searchParams.get('email') || '',
        eventId: searchParams.get('eventId') || '',
      }
      await this.calendarService.deleteEvent(payload)
      return this.json({ success: true, message: 'Event berhasil dihapus dari Google Calendar' })
    } catch (error: any) {
      if (error?.code === 404) {
        return this.json({ success: true, message: 'Event sudah tidak ada di Google Calendar' })
      }
      return this.handleCalendarError(error, 'Error deleting Google Calendar event:', 'Gagal menghapus event di Google Calendar')
    }
  }

  private async handleCalendarError(error: any, logLabel: string, fallbackMessage: string) {
    if (error instanceof AppError) {
      return this.json({ error: error.message }, { status: error.statusCode })
    }
    console.error(logLabel, error)
    return this.json({ error: fallbackMessage, details: error?.message }, { status: 500 })
  }
}

