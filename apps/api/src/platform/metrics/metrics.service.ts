import { Injectable } from '@nestjs/common'

/** Lightweight Prometheus exposition for Grafana scraping. */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>()

  inc(name: string, by = 1) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by)
  }

  renderPrometheus() {
    const lines = [
      '# HELP autoads_up AutoAds API process up',
      '# TYPE autoads_up gauge',
      'autoads_up 1',
      '# HELP autoads_http_requests_total Counter stub for request instrumentation',
      '# TYPE autoads_http_requests_total counter',
    ]
    for (const [name, value] of this.counters) {
      lines.push(`autoads_custom_${name} ${value}`)
    }
    lines.push(`autoads_http_requests_total ${this.counters.get('http_requests') ?? 0}`)
    return `${lines.join('\n')}\n`
  }
}
