import { Controller, Get } from '@nestjs/common'
import { AnalyticsService } from './analytics/analytics.service'
import { EventsService } from './events/events.service'
import { MqttService } from './mqtt/mqtt.service'
import { QueueService } from './queue/queue.service'
import { RedisService } from './redis/redis.service'
import { StorageService } from './storage/storage.service'

@Controller('platform/health')
export class PlatformHealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly queue: QueueService,
    private readonly mqtt: MqttService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
    private readonly events: EventsService,
  ) {}

  @Get()
  async status() {
    const clickhouse = await this.analytics.ping()
    return {
      ok: true,
      stack: {
        frontend: 'React + TypeScript + Vite + Tailwind',
        backend: 'Node.js + NestJS',
        api: 'REST',
        database: 'Supabase PostgreSQL (local Docker Postgres)',
        auth: 'Supabase Auth JWT',
        authorization: 'RBAC + PostgreSQL RLS',
        cache: 'Redis',
        jobs: 'BullMQ',
        events: 'AWS SQS',
        mqtt: 'EMQX / AWS IoT Core',
        analytics: 'ClickHouse',
        storage: 'Amazon S3 (+ MinIO local)',
        cdn: 'CloudFront',
        hosting: 'AWS',
        containers: 'Docker',
        cicd: 'GitHub Actions',
        monitoring: 'Grafana + Prometheus + Sentry',
      },
      dependencies: {
        redis: this.redis.isReady(),
        bullmq: this.queue.isReady(),
        mqtt: this.mqtt.isReady(),
        s3: this.storage.isReady(),
        clickhouse,
        sqs: this.events.isReady(),
      },
    }
  }
}
