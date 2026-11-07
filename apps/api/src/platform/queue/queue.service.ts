import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue, Worker, type Job } from 'bullmq'
import IORedis from 'ioredis'

export type CampaignJobName = 'allocate-inventory' | 'sync-playback' | 'notify-advertiser'

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name)
  private connection: IORedis | null = null
  private campaignQueue: Queue | null = null
  private worker: Worker | null = null
  private ready = false

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const enabled = (this.config.get<string>('BULLMQ_ENABLED') ?? 'true') !== 'false'
    const url = this.config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379'
    if (!enabled) {
      this.logger.warn('BullMQ disabled')
      return
    }
    try {
      this.connection = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: true })
      await this.connection.connect()
      this.campaignQueue = new Queue('autoads-campaigns', { connection: this.connection })
      this.worker = new Worker(
        'autoads-campaigns',
        async (job: Job) => this.handleJob(job),
        { connection: this.connection.duplicate() },
      )
      this.worker.on('failed', (job, err) => {
        this.logger.warn(`Job ${job?.name} failed: ${err.message}`)
      })
      this.ready = true
      this.logger.log('BullMQ campaign queue ready')
    } catch (error) {
      this.ready = false
      this.logger.warn(
        `BullMQ unavailable: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined)
    await this.campaignQueue?.close().catch(() => undefined)
    await this.connection?.quit().catch(() => undefined)
  }

  isReady() {
    return this.ready
  }

  async enqueue(name: CampaignJobName, data: Record<string, unknown>, delayMs = 0) {
    if (!this.campaignQueue || !this.ready) {
      this.logger.debug(`Queue skipped (${name}) — BullMQ offline`)
      return null
    }
    return this.campaignQueue.add(name, data, {
      delay: delayMs,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    })
  }

  private async handleJob(job: Job) {
    this.logger.log(`Processing ${job.name} ${job.id}`)
    switch (job.name as CampaignJobName) {
      case 'allocate-inventory':
      case 'sync-playback':
      case 'notify-advertiser':
        return { ok: true, name: job.name, at: new Date().toISOString() }
      default:
        return { ok: true, ignored: true }
    }
  }
}
