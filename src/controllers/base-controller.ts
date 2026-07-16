import { NextResponse } from 'next/server'
import { AppError } from '@/src/models/app-error'

export abstract class BaseController {
  protected json(data: unknown, init?: ResponseInit) {
    return NextResponse.json(data, init)
  }

  protected handleError(error: unknown, logLabel: string, fallbackMessage: string) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error(logLabel, error)
    const details = error instanceof Error ? error.message : undefined
    return NextResponse.json({ error: fallbackMessage, ...(details ? { details } : {}) }, { status: 500 })
  }
}

