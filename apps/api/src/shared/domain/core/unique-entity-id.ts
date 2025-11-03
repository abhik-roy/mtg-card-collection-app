import { randomUUID } from 'crypto';

export class UniqueEntityId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value?: string): UniqueEntityId {
    return new UniqueEntityId(value ?? randomUUID());
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: UniqueEntityId): boolean {
    return this.value === other.value;
  }
}
