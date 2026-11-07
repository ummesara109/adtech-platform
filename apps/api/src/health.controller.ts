import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'autoads-api',
      stack: {
        runtime: 'Node.js + NestJS',
        database: 'Supabase PostgreSQL',
        auth: 'Supabase Auth JWT',
        cache: 'Redis',
        jobs: 'BullMQ',
        mqtt: 'EMQX / AWS IoT Core',
        analytics: 'ClickHouse',
        storage: 'S3 + CloudFront',
      },
      docs: '/api/v1/platform/health',
    }
  }
}
