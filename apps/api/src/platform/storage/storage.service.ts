import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Creative file storage — Amazon S3 in production, MinIO locally.
 * CloudFront CDN URL is exposed via MEDIA_CDN_URL for advertiser previews.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private client: S3Client | null = null
  private bucket: string
  private cdnBase: string

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') || 'autoads-creatives'
    this.cdnBase = (config.get<string>('MEDIA_CDN_URL') || '').replace(/\/$/, '')
    const endpoint = config.get<string>('S3_ENDPOINT')
    const region = config.get<string>('AWS_REGION') || 'ap-south-1'
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID') || config.get<string>('S3_ACCESS_KEY')
    const secretAccessKey =
      config.get<string>('AWS_SECRET_ACCESS_KEY') || config.get<string>('S3_SECRET_KEY')

    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        forcePathStyle: Boolean(endpoint),
        credentials: { accessKeyId, secretAccessKey },
      })
      this.logger.log(`S3 client ready (bucket=${this.bucket}${endpoint ? `, endpoint=${endpoint}` : ''})`)
    } else {
      this.logger.warn('S3 credentials missing — creative uploads stay local/dev metadata only')
    }
  }

  isReady() {
    return this.client != null
  }

  publicUrl(key: string) {
    if (this.cdnBase) return `${this.cdnBase}/${key}`
    const endpoint = this.config.get<string>('S3_ENDPOINT')
    if (endpoint) return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`
    return `s3://${this.bucket}/${key}`
  }

  async putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
    if (!this.client) {
      return { ok: false as const, url: this.publicUrl(key), reason: 's3_not_configured' }
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
    return { ok: true as const, url: this.publicUrl(key) }
  }
}
