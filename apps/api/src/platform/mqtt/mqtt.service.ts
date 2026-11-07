import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import mqtt, { type MqttClient } from 'mqtt'

/**
 * Device communication via MQTT (EMQX locally / AWS IoT Core in production).
 * Publishes campaign playlist updates; subscribes to device heartbeats when connected.
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name)
  private client: MqttClient | null = null
  private ready = false

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const enabled = (this.config.get<string>('MQTT_ENABLED') ?? 'true') !== 'false'
    const url = this.config.get<string>('MQTT_URL') || 'mqtt://127.0.0.1:1883'
    if (!enabled) {
      this.logger.warn('MQTT disabled')
      return
    }
    try {
      this.client = mqtt.connect(url, {
        clientId: `autoads-api-${process.pid}`,
        reconnectPeriod: 5000,
        connectTimeout: 4000,
      })
      this.client.on('connect', () => {
        this.ready = true
        this.logger.log(`MQTT connected (${url})`)
        this.client?.subscribe('autoads/devices/+/heartbeat', (err) => {
          if (err) this.logger.warn(`MQTT subscribe failed: ${err.message}`)
        })
      })
      this.client.on('error', (err) => {
        this.ready = false
        this.logger.warn(`MQTT error: ${err.message}`)
      })
      this.client.on('close', () => {
        this.ready = false
      })
      this.client.on('message', (topic, payload) => {
        this.logger.debug(`MQTT ${topic}: ${payload.toString().slice(0, 120)}`)
      })
    } catch (error) {
      this.logger.warn(`MQTT init failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  onModuleDestroy() {
    this.client?.end(true)
  }

  isReady() {
    return this.ready
  }

  publishCampaignUpdate(screenId: string, body: Record<string, unknown>) {
    if (!this.client || !this.ready) return false
    const topic = `autoads/screens/${screenId}/campaign`
    this.client.publish(topic, JSON.stringify(body), { qos: 1 })
    return true
  }
}
