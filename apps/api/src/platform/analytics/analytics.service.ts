import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * ClickHouse analytics reader for Proof of Play dashboards.
 * Falls back to empty series when ClickHouse is offline (honest empty state).
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)
  private readonly baseUrl: string
  private readonly enabled: boolean

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (config.get<string>('CLICKHOUSE_URL') || 'http://127.0.0.1:8123').replace(/\/$/, '')
    this.enabled = (config.get<string>('CLICKHOUSE_ENABLED') ?? 'true') !== 'false'
  }

  isConfigured() {
    return this.enabled
  }

  async ping() {
    if (!this.enabled) return false
    try {
      const res = await fetch(`${this.baseUrl}/ping`, { method: 'GET' })
      return res.ok
    } catch {
      return false
    }
  }

  async companyPlaybackSummary(companyId: string, days = 14) {
    if (!this.enabled) return { source: 'disabled' as const, points: [] as Array<{ day: string; plays: number }> }
    const query = `
      SELECT toString(day) AS day, sum(completed_plays) AS plays
      FROM autoads.playback_daily
      WHERE company_id = {companyId:String}
        AND day >= today() - ${Math.max(1, Math.min(days, 90))}
      GROUP BY day
      ORDER BY day
      FORMAT JSON
    `
    try {
      const url = `${this.baseUrl}/?database=autoads`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query.replace('{companyId:String}', `'${companyId.replace(/'/g, "\\'")}'`),
      })
      if (!res.ok) {
        this.logger.warn(`ClickHouse query failed: ${res.status}`)
        return { source: 'error' as const, points: [] }
      }
      const json = (await res.json()) as { data?: Array<{ day: string; plays: string | number }> }
      return {
        source: 'clickhouse' as const,
        points: (json.data ?? []).map((row) => ({
          day: row.day,
          plays: Number(row.plays) || 0,
        })),
      }
    } catch (error) {
      this.logger.warn(`ClickHouse unreachable: ${error instanceof Error ? error.message : String(error)}`)
      return { source: 'offline' as const, points: [] }
    }
  }
}
