import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CollectionModule } from './modules/collection/collection.module';
import { EnvValidation } from './config/env.validation';
import { AlertsModule } from './modules/alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: EnvValidation,
    }),
    ScheduleModule.forRoot(),
    CatalogModule,
    CollectionModule,
    AlertsModule,
  ],
})
export class AppModule {}
