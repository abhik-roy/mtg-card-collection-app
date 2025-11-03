const CONDITION_VALUES = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const;

export type ConditionValue = (typeof CONDITION_VALUES)[number];

export class Condition {
  private constructor(private readonly internalValue: ConditionValue) {}

  static create(value: string): Condition {
    if (!CONDITION_VALUES.includes(value as ConditionValue)) {
      throw new Error(`Invalid condition: ${value}`);
    }
    return new Condition(value as ConditionValue);
  }

  static fromPrisma(value: string): Condition {
    return this.create(value);
  }

  get value(): ConditionValue {
    return this.internalValue;
  }
}
