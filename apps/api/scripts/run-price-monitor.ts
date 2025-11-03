import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PriceSpikeMonitorService } from '../src/modules/alerts/app/services/price-spike-monitor.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const monitor = app.get(PriceSpikeMonitorService);
    await monitor.checkForSpikes();
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to run price monitor', error);
  process.exit(1);
});
