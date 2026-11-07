import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { AppModule } from './app.module'
import { initSentry } from './observability/sentry'

async function bootstrap() {
  initSentry()
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.setGlobalPrefix('api/v1')
  app.enableCors({
    origin: true,
    credentials: true,
  })
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  const port = Number(process.env.PORT || 3000)
  // Bind all interfaces so Expo Go on a LAN phone can reach the API (not just localhost).
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`AutoAds API listening on http://0.0.0.0:${port}/api/v1`)
}

void bootstrap()
