import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CollectionModule } from './modules/collection/collection.module';
import { EnvValidation } from './config/env.validation';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuthModule } from './modules/auth/auth.module';
import { DecksModule } from './modules/decks/decks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: EnvValidation,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CatalogModule,
    CollectionModule,
    DecksModule,
    AlertsModule,
  ],
})
export class AppModule {}
