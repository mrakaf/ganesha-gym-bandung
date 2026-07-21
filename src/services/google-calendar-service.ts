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

export class GoogleCalendarService {
  async listEvents(params: CalendarListEventsQuery) {
    const { member, calendar } = await this.getMemberAndClient(params.email)
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

  async createEvent(params: CalendarCreateEventInput) {
    const { member, calendar } = await this.getMemberAndClient(params.email)
    if (!params.title || !params.start || !params.end) {
      throw new AppError('Title, start, dan end wajib diisi', 400)
    }

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

  async updateEvent(params: CalendarUpdateEventInput) {
    const { member, calendar } = await this.getMemberAndClient(params.email)
    if (!params.eventId || !params.title || !params.start || !params.end) {
      throw new AppError('EventId, title, start, dan end wajib diisi', 400)
    }
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

  async deleteEvent(params: CalendarDeleteEventInput) {
    const { member, calendar } = await this.getMemberAndClient(params.email)
    if (!params.eventId) throw new AppError('EventId wajib diisi', 400)
    await calendar.events.delete({ calendarId: 'primary', eventId: params.eventId })
  }

  async checkConnection(email: string): Promise<boolean> {
    try {
      await this.getMemberAndClient(email)
      return true
    } catch {
      return false
    }
  }

  private async getMemberAndClient(email: string) {
    if (!email) throw new AppError('Akses ditolak. Email user wajib dikirim.', 401)
    const member = await prisma.member.findUnique({
      where: { email },
      select: { 
        membershipEnd: true, 
        accessType: true, 
        accessStart: true, 
        accessEnd: true,
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    })
    if (!member || !hasPremiumAccess(member)) {
      throw new AppError('Fitur Google Calendar hanya untuk member/visit aktif.', 403)
    }
    if (!member.googleAccessToken && !member.googleRefreshToken) {
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
      access_token: member.googleAccessToken,
      refresh_token: member.googleRefreshToken,
    })
    return { member, calendar: google.calendar({ version: 'v3', auth: oauth2Client }) }
  }
}

