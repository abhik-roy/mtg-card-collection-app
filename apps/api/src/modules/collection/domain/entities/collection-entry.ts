import { Entity } from '../../../../shared/domain/core/entity';
import { UniqueEntityId } from '../../../../shared/domain/core/unique-entity-id';
import { Condition } from '../value-objects/condition.vo';
import { Finish } from '../value-objects/finish.vo';

export interface CollectionEntryProps {
  cardId: string;
  quantity: number;
  finish: Finish;
  condition: Condition;
  language: string;
  acquiredPrice?: number;
  acquiredDate?: Date;
  location?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  id?: UniqueEntityId;
}

export class CollectionEntry extends Entity<CollectionEntryProps> {
  private constructor(props: CollectionEntryProps) {
    if (props.quantity < 0) {
      throw new Error('Quantity must be >= 0');
    }
    super({
      ...props,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  static create(props: CollectionEntryProps): CollectionEntry {
    return new CollectionEntry(props);
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get finish(): Finish {
    return this.props.finish;
  }

  get condition(): Condition {
    return this.props.condition;
  }

  get language(): string {
    return this.props.language;
  }

  get acquiredPrice(): number | undefined {
    return this.props.acquiredPrice;
  }

  get acquiredDate(): Date | undefined {
    return this.props.acquiredDate;
  }

  get location(): string | undefined {
    return this.props.location;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get createdAt(): Date {
    return this.props.createdAt as Date;
  }

  get updatedAt(): Date {
    return this.props.updatedAt as Date;
  }

  updateQuantity(quantity: number) {
    if (quantity < 0) {
      throw new Error('Quantity must be >= 0');
    }
    this.props.quantity = quantity;
    this.touch();
  }

  updateDetails(partial: Partial<Omit<CollectionEntryProps, 'cardId' | 'id'>>) {
    if (partial.quantity !== undefined && partial.quantity < 0) {
      throw new Error('Quantity must be >= 0');
    }

    this.props = {
      ...this.props,
      ...partial,
      id: this.props.id,
      quantity: partial.quantity ?? this.props.quantity,
      finish: partial.finish ?? this.props.finish,
      condition: partial.condition ?? this.props.condition,
      language: partial.language ?? this.props.language,
    };

    this.touch();
  }

  private touch() {
    this.props.updatedAt = new Date();
  }
}
