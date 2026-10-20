import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { config } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // The web app proxies /api/* here, so browser and API share one origin and no CORS is needed.
  await app.listen(config.port);
  new Logger('API').log(`Listening on http://localhost:${config.port}`);
}

void bootstrap();
