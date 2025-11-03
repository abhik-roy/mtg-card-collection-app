import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/infra/prisma/prisma.service';
import { ScryfallClient } from '../../shared/infra/http/scryfall.client';
import { AlertsController } from './rest/alerts.controller';
import { CreatePriceWatchCommand } from './app/commands/create-price-watch.command';
import { DeletePriceWatchCommand } from './app/commands/delete-price-watch.command';
import { ListPriceWatchesQuery } from './app/queries/list-price-watches.query';
import { PriceSpikeMonitorService } from './app/services/price-spike-monitor.service';
import { PriceWatchPrismaRepository } from './infra/price-watch.prisma.repository';
import {
  NOTIFICATION_GATEWAY,
  LoggingNotificationGateway,
  EmailNotificationGateway,
  DiscordNotificationGateway,
} from './infra/notification.gateway';
import { PRICE_WATCH_REPOSITORY } from './domain/repositories/price-watch.repository';
import { PriceWatchBaselineService } from './app/services/price-watch-baseline.service';

@Module({
  controllers: [AlertsController],
  providers: [
    PrismaService,
    ScryfallClient,
    CreatePriceWatchCommand,
    DeletePriceWatchCommand,
    ListPriceWatchesQuery,
    PriceSpikeMonitorService,
    PriceWatchBaselineService,
    LoggingNotificationGateway,
    EmailNotificationGateway,
    DiscordNotificationGateway,
    {
      provide: PRICE_WATCH_REPOSITORY,
      useClass: PriceWatchPrismaRepository,
    },
    {
      provide: NOTIFICATION_GATEWAY,
      inject: [
        DiscordNotificationGateway,
        EmailNotificationGateway,
        LoggingNotificationGateway,
        ConfigService,
      ],
      useFactory: (
        discordGateway: DiscordNotificationGateway,
        emailGateway: EmailNotificationGateway,
        loggingGateway: LoggingNotificationGateway,
        configService: ConfigService,
      ) => {
        const webhook = configService.get<string>('DISCORD_WEBHOOK_URL');
        if (webhook && discordGateway.isEnabled) {
          return discordGateway;
        }

        const smtpHost = configService.get<string>('SMTP_HOST');
        if (smtpHost && emailGateway.isEnabled) {
          return emailGateway;
        }

        return loggingGateway;
      },
    },
  ],
})
export class AlertsModule {}
