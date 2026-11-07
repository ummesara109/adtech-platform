import { Logger } from '@nestjs/common'

const logger = new Logger('Sentry')

/** Optional Sentry bootstrap — no-ops when SENTRY_DSN is unset. */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logger.log('Sentry disabled (no SENTRY_DSN)')
    return
  }
  // Dynamic import keeps local/dev free of hard dependency failures if package resolves later.
  logger.log('Sentry DSN present — wire @sentry/node in production deploy for full APM')
}
