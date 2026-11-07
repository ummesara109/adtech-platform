import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

/**
 * AWS SQS event bus for cross-service workflows (billing, allocation, PoP ingest).
 * In local/dev without AWS credentials, events are logged only.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)
  private client: SQSClient | null = null
  private queueUrl: string

  constructor(private readonly config: ConfigService) {
    this.queueUrl = config.get<string>('AWS_SQS_QUEUE_URL') || ''
    const region = config.get<string>('AWS_REGION') || 'ap-south-1'
    if (this.queueUrl && config.get<string>('AWS_ACCESS_KEY_ID')) {
      this.client = new SQSClient({ region })
      this.logger.log('SQS client ready')
    } else {
      this.logger.warn('SQS not configured — events log locally')
    }
  }

  isReady() {
    return Boolean(this.client && this.queueUrl)
  }

  async publish(type: string, payload: Record<string, unknown>) {
    const body = JSON.stringify({ type, payload, at: new Date().toISOString() })
    if (!this.client || !this.queueUrl) {
      this.logger.debug(`Event ${type}: ${body.slice(0, 200)}`)
      return { ok: true as const, transport: 'local' as const }
    }
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: body,
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: type },
        },
      }),
    )
    return { ok: true as const, transport: 'sqs' as const }
  }
}
