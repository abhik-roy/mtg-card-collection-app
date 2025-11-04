import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CollectionModule } from './modules/collection/collection.module';
import { EnvValidation } from './config/env.validation';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuthModule } from './modules/auth/auth.module';
import { DecksModule } from './modules/decks/decks.module';
import { DebugModule } from './modules/debug/debug.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: EnvValidation,
      envFilePath: [
        'apps/api/.env.local',
        `apps/api/.env.${process.env.NODE_ENV ?? 'development'}`,
        'apps/api/.env',
      ],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => [
        {
          ttl: config.get<number>('RATE_LIMIT_TTL') ?? 60,
          limit: config.get<number>('RATE_LIMIT_MAX') ?? 120,
        },
      ],
    }),
    AuthModule,
    CatalogModule,
    CollectionModule,
    DecksModule,
    AlertsModule,
    DebugModule,
    PortfolioModule,
    MarketplaceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
