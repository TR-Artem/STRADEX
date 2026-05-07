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
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3102;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  const interfaces = require('os').networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  logger.log(`Stradex Parking System running`);
  logger.log(`Local:   http://localhost:${port}`);
  addresses.forEach(addr => logger.log(`Network: http://${addr}:${port}`));
  logger.log(`API:     http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});