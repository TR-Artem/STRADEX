import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3102;
  await app.listen(port);
  
  logger.log(`Stradex Parking System running on http://localhost:${port}`);
  logger.log(`API: http://localhost:${port}/api/v1`);
  logger.log(`Health: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});