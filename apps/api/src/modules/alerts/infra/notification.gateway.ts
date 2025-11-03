import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { EnvConfig } from '../../../config/env.validation';
import { PriceWatch } from '../domain/entities/price-watch';

export interface NotificationPayload {
  watch: PriceWatch;
  cardName: string;
  setCode: string;
  collectorNumber: string;
  currentPrice: number;
  previousPrice: number;
}

export interface NotificationGateway {
  notifySpike(payload: NotificationPayload): Promise<void>;
}

export const NOTIFICATION_GATEWAY = Symbol('NOTIFICATION_GATEWAY');

export class LoggingNotificationGateway implements NotificationGateway {
  private readonly logger = new Logger('PriceSpikeNotification');

  async notifySpike(payload: NotificationPayload): Promise<void> {
    this.logger.warn(
      `Price spike detected for ${payload.cardName} (${payload.setCode} ${payload.collectorNumber}) - ${payload.previousPrice.toFixed(2)} -> ${payload.currentPrice.toFixed(2)} (${payload.watch.thresholdPercent}% ${payload.watch.direction}) -> notifying ${payload.watch.contact}`,
    );
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class EmailNotificationGateway implements NotificationGateway {
  private readonly logger = new Logger('PriceSpikeEmail');
  private readonly transporter?: nodemailer.Transporter;
  private readonly fromAddress?: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService<EnvConfig>) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const secure = config.get<boolean>('SMTP_SECURE') ?? false;
    this.fromAddress = config.get<string>('SMTP_FROM');

    if (host && port && user && pass && this.fromAddress) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.enabled = true;
    } else {
      this.enabled = false;
      this.logger.warn('SMTP configuration missing; email notifications disabled.');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async notifySpike(payload: NotificationPayload): Promise<void> {
    if (!this.enabled || !this.transporter || !this.fromAddress) {
      this.logger.warn('Email notification skipped; transporter not configured');
      return;
    }

    const recipient = payload.watch.contact;
    if (!recipient || !EMAIL_REGEX.test(recipient)) {
      this.logger.warn(`Email notification skipped; invalid recipient: ${recipient}`);
      return;
    }

    const subject = `Price alert: ${payload.cardName} ${payload.watch.direction === 'UP' ? 'spiked' : 'dropped'}`;
    const text = [
      `Card: ${payload.cardName} (${payload.setCode} ${payload.collectorNumber})`,
      `Change: ${payload.previousPrice.toFixed(2)} -> ${payload.currentPrice.toFixed(2)} (${payload.watch.thresholdPercent}% ${payload.watch.direction})`,
      `Price type: ${payload.watch.priceType}`,
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: recipient,
        subject,
        text,
      });
      this.logger.log(`Price alert email sent to ${recipient} for ${payload.cardName}`);
    } catch (error) {
      this.logger.error(`Failed to send price alert email to ${recipient}`, error as Error);
    }
  }
}

@Injectable()
export class DiscordNotificationGateway implements NotificationGateway {
  private readonly logger = new Logger('PriceSpikeDiscord');
  private readonly webhookUrl?: string;

  constructor(private readonly config: ConfigService<EnvConfig>) {
    this.webhookUrl = config.get<string>('DISCORD_WEBHOOK_URL');
    if (!this.webhookUrl) {
      this.logger.warn('Discord webhook URL missing; Discord notifications disabled.');
    }
  }

  get isEnabled(): boolean {
    return Boolean(this.webhookUrl);
  }

  async notifySpike(payload: NotificationPayload): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    const content = [
      `**Price Alert: ${payload.cardName}**`,
      `Set: ${payload.setCode} #${payload.collectorNumber}`,
      `Change: ${payload.previousPrice.toFixed(2)} → ${payload.currentPrice.toFixed(2)} (${payload.watch.thresholdPercent}% ${payload.watch.direction})`,
      `Type: ${payload.watch.priceType}`,
      payload.watch.contact ? `Contact: ${payload.watch.contact}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Discord responded with status ${response.status}`);
      }

      this.logger.log(`Discord alert posted for ${payload.cardName}`);
    } catch (error) {
      this.logger.error('Failed to send Discord alert', error as Error);
    }
  }
}
