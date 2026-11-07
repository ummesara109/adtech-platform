import { Module } from '@nestjs/common'
import { AnalyticsModule } from './analytics/analytics.module'
import { EventsModule } from './events/events.module'
import { MetricsModule } from './metrics/metrics.module'
import { MqttModule } from './mqtt/mqtt.module'
import { QueueModule } from './queue/queue.module'
import { RedisModule } from './redis/redis.module'
import { StorageModule } from './storage/storage.module'
import { PlatformHealthController } from './platform-health.controller'

@Module({
  imports: [
    RedisModule,
    QueueModule,
    MqttModule,
    StorageModule,
    AnalyticsModule,
    EventsModule,
    MetricsModule,
  ],
  controllers: [PlatformHealthController],
})
export class PlatformModule {}
