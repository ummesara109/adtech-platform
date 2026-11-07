import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { promises as fs } from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

@Injectable()
export class LocalUploadService {
  private readonly logger = new Logger(LocalUploadService.name)
  private readonly root: string

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get('UPLOAD_ROOT') || path.join(process.cwd(), 'uploads'))
  }

  async saveDriverDocument(opts: {
    driverId: string
    kind: 'kyc' | 'rc'
    originalName: string
    buffer: Buffer
  }) {
    const safeName = opts.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const rel = path.join('drivers', opts.driverId, opts.kind, `${Date.now()}-${randomUUID()}-${safeName}`)
    const abs = path.join(this.root, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, opts.buffer)
    this.logger.log(`Stored upload ${rel}`)
    return {
      storageKey: rel.replace(/\\/g, '/'),
      absolutePath: abs,
    }
  }
}
