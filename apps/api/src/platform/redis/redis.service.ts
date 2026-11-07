import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis | null = null
  private ready = false

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379'
    const enabled = (this.config.get<string>('REDIS_ENABLED') ?? 'true') !== 'false'
    if (!enabled) {
      this.logger.warn('Redis disabled (REDIS_ENABLED=false)')
      return
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      })
      this.client.on('error', (err) => {
        this.ready = false
        this.logger.warn(`Redis error: ${err.message}`)
      })
      await this.client.connect()
      this.ready = true
      this.logger.log(`Redis connected (${url})`)
    } catch (error) {
      this.ready = false
      this.logger.warn(
        `Redis unavailable — cache/queues degrade gracefully: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      this.client?.disconnect()
      this.client = null
    }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => undefined)
  }

  isReady() {
    return this.ready
  }

  getClient() {
    return this.client
  }

  async get(key: string) {
    if (!this.client || !this.ready) return null
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (!this.client || !this.ready) return false
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, value)
    }
    return true
  }

  async del(key: string) {
    if (!this.client || !this.ready) return false
    await this.client.del(key)
    return true
  }
}
