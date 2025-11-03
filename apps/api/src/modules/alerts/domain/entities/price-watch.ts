import { Entity } from '../../../../shared/domain/core/entity';
import { UniqueEntityId } from '../../../../shared/domain/core/unique-entity-id';

export type PriceDirection = 'UP' | 'DOWN';
export type PriceType = 'USD' | 'USD_FOIL';

export interface PriceWatchProps {
  cardId: string;
  direction: PriceDirection;
  priceType: PriceType;
  thresholdPercent: number;
  contact: string;
  lastPrice?: number;
  lastNotifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  id?: UniqueEntityId;
}

export class PriceWatch extends Entity<PriceWatchProps> {
  private constructor(props: PriceWatchProps) {
    super({
      ...props,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.ensureValid();
  }

  static create(props: PriceWatchProps): PriceWatch {
    return new PriceWatch(props);
  }

  private ensureValid() {
    if (!this.cardId || this.cardId.trim().length === 0) {
      throw new Error('cardId is required');
    }

    if (!['UP', 'DOWN'].includes(this.direction)) {
      throw new Error(`Invalid direction: ${this.direction}`);
    }

    if (!['USD', 'USD_FOIL'].includes(this.priceType)) {
      throw new Error(`Invalid price type: ${this.priceType}`);
    }

    if (this.thresholdPercent <= 0) {
      throw new Error('thresholdPercent must be greater than zero');
    }

    if (!this.contact || this.contact.trim().length === 0) {
      throw new Error('contact is required');
    }
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get direction(): PriceDirection {
    return this.props.direction;
  }

  get priceType(): PriceType {
    return this.props.priceType;
  }

  get thresholdPercent(): number {
    return this.props.thresholdPercent;
  }

  get contact(): string {
    return this.props.contact;
  }

  get lastPrice(): number | undefined {
    return this.props.lastPrice;
  }

  get lastNotifiedAt(): Date | undefined {
    return this.props.lastNotifiedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt as Date;
  }

  get updatedAt(): Date {
    return this.props.updatedAt as Date;
  }

  updateLastPrice(price: number) {
    this.props.lastPrice = price;
    this.touch();
  }

  markNotified(price: number) {
    this.props.lastPrice = price;
    this.props.lastNotifiedAt = new Date();
    this.touch();
  }

  private touch() {
    this.props.updatedAt = new Date();
  }
}
