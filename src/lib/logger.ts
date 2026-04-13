import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  userId?: string
  endpoint: string
  method: string
  ipAddress?: string
  userAgent?: string
  requestBody?: any
  responseStatus?: number
  responseTimeMs?: number
  errorMessage?: string
  metadata?: any
}

class Logger {
  private supabase: ReturnType<typeof createClient<Database>> | null = null

  private getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }
    return this.supabase
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`
  }

  private async writeToDatabase(entry: LogEntry) {
    // Skip database logging in development or if logs table doesn't exist
    if (process.env.NODE_ENV === 'development') {
      return
    }
    
    try {
      const supabase = this.getSupabase()
      const { error } = await supabase
        .from('request_logs')
        .insert({
          user_id: entry.userId,
          endpoint: entry.endpoint,
          method: entry.method,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          request_body: entry.requestBody,
          response_status: entry.responseStatus,
          response_time_ms: entry.responseTimeMs,
          error_message: entry.errorMessage,
        })

      if (error) {
        // Only log error to console, don't affect main request
        console.error('Failed to write log to database:', error)
      }
    } catch (error) {
      // Only log error to console, don't affect main request
      console.error('Error writing log to database:', error)
    }
  }

  async log(level: LogLevel, message: string, entry: Partial<LogEntry> = {}) {
    const formattedMessage = this.formatMessage(level, message, entry.metadata)
    
    switch (level) {
      case 'error':
        console.error(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'debug':
        console.debug(formattedMessage)
        break
      default:
        console.log(formattedMessage)
    }

    if (level === 'error' || level === 'warn' || entry.endpoint) {
      await this.writeToDatabase({
        userId: entry.userId,
        endpoint: entry.endpoint || 'unknown',
        method: entry.method || 'unknown',
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        requestBody: entry.requestBody,
        responseStatus: entry.responseStatus,
        responseTimeMs: entry.responseTimeMs,
        errorMessage: entry.errorMessage,
      })
    }
  }

  async info(message: string, entry?: Partial<LogEntry>) {
    await this.log('info', message, entry)
  }

  async warn(message: string, entry?: Partial<LogEntry>) {
    await this.log('warn', message, entry)
  }

  async error(message: string, entry?: Partial<LogEntry>) {
    await this.log('error', message, entry)
  }

  async debug(message: string, entry?: Partial<LogEntry>) {
    await this.log('debug', message, entry)
  }
}

export const logger = new Logger()

export function getIpAddress(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return undefined
}

export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined
}
