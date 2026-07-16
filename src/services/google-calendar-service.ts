import { google } from 'googleapis'
import { prisma } from '@/lib/db'
import { hasPremiumAccess } from '@/src/helpers/premium-access'
import { AppError } from '@/src/models/app-error'
import {
  CalendarCreateEventInput,
  CalendarDeleteEventInput,
  CalendarListEventsQuery,
  CalendarUpdateEventInput,
} from '@/src/models/calendar-event'

type CookieGetter = {
  get(name: string): { value: string } | undefined
}

export class GoogleCalendarService {
  async listEvents(params: {
    cookieStore: CookieGetter
  } & CalendarListEventsQuery) {
    await this.ensurePremiumAccess(params.email)
    const calendar = this.createCalendarClient(params.cookieStore)
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: params.timeMin || new Date().toISOString(),
      timeMax: params.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: params.maxResults || 50,
      singleEvents: true,
      orderBy: 'startTime',
    })
    const events = response.data.items || []
    return events.map((event) => ({
      id: event.id,
      title: event.summary || 'No Title',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      location: event.location || '',
      htmlLink: event.htmlLink || '',
    }))
  }

  async createEvent(params: {
    cookieStore: CookieGetter
  } & CalendarCreateEventInput) {
    await this.ensurePremiumAccess(params.email)
    if (!params.title || !params.start || !params.end) {
      throw new AppError('Title, start, dan end wajib diisi', 400)
    }
    const calendar = this.createCalendarClient(params.cookieStore)

    if (params.idempotencyKey) {
      const existing = await calendar.events.list({
        calendarId: 'primary',
        privateExtendedProperty: [`appIdempotencyKey=${params.idempotencyKey}`],
        singleEvents: true,
        maxResults: 1,
      })
      const existingEvent = existing.data.items?.[0]
      if (existingEvent) {
        return {
          duplicate: true,
          event: {
            id: existingEvent.id,
            title: existingEvent.summary,
            start: existingEvent.start?.dateTime || existingEvent.start?.date,
            end: existingEvent.end?.dateTime || existingEvent.end?.date,
            htmlLink: existingEvent.htmlLink,
          },
        }
      }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: params.title,
        description: params.description || '',
        location: params.location || '',
        start: { dateTime: params.start, timeZone: 'Asia/Jakarta' },
        end: { dateTime: params.end, timeZone: 'Asia/Jakarta' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 15 },
            { method: 'popup', minutes: 5 },
          ],
        },
        extendedProperties: params.idempotencyKey
          ? { private: { appIdempotencyKey: String(params.idempotencyKey) } }
          : undefined,
      },
    })

    return {
      duplicate: false,
      event: {
        id: response.data.id,
        title: response.data.summary,
        start: response.data.start?.dateTime || response.data.start?.date,
        end: response.data.end?.dateTime || response.data.end?.date,
        htmlLink: response.data.htmlLink,
      },
    }
  }

  async updateEvent(params: {
    cookieStore: CookieGetter
  } & CalendarUpdateEventInput) {
    await this.ensurePremiumAccess(params.email)
    if (!params.eventId || !params.title || !params.start || !params.end) {
      throw new AppError('EventId, title, start, dan end wajib diisi', 400)
    }
    const calendar = this.createCalendarClient(params.cookieStore)
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: params.eventId,
      requestBody: {
        summary: params.title,
        description: params.description || '',
        location: params.location || '',
        start: { dateTime: params.start, timeZone: 'Asia/Jakarta' },
        end: { dateTime: params.end, timeZone: 'Asia/Jakarta' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 15 },
            { method: 'popup', minutes: 5 },
          ],
        },
      },
    })
    return {
      id: response.data.id,
      title: response.data.summary,
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      htmlLink: response.data.htmlLink,
    }
  }

  async deleteEvent(params: { cookieStore: CookieGetter } & CalendarDeleteEventInput) {
    await this.ensurePremiumAccess(params.email)
    if (!params.eventId) throw new AppError('EventId wajib diisi', 400)
    const calendar = this.createCalendarClient(params.cookieStore)
    await calendar.events.delete({ calendarId: 'primary', eventId: params.eventId })
  }

  private async ensurePremiumAccess(email: string) {
    if (!email) throw new AppError('Akses ditolak. Email user wajib dikirim.', 401)
    const member = await prisma.member.findUnique({
      where: { email },
      select: { membershipEnd: true, accessType: true, accessStart: true, accessEnd: true },
    })
    if (!member || !hasPremiumAccess(member)) {
      throw new AppError('Fitur Google Calendar hanya untuk member/visit aktif.', 403)
    }
  }

  private createCalendarClient(cookieStore: CookieGetter) {
    const accessToken = cookieStore.get('google_access_token')?.value
    const refreshToken = cookieStore.get('google_refresh_token')?.value
    if (!accessToken && !refreshToken) {
      throw new AppError('Belum terhubung dengan Google Calendar. Silakan login terlebih dahulu.', 401)
    }
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    if (!clientId || !clientSecret) {
      throw new AppError('Google Calendar API belum dikonfigurasi dengan benar.', 500)
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    return google.calendar({ version: 'v3', auth: oauth2Client })
  }
}

