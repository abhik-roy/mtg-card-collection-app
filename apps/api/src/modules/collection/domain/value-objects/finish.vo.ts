const FINISH_VALUES = ['NONFOIL', 'FOIL', 'ETCHED'] as const;

export type FinishValue = (typeof FINISH_VALUES)[number];

export class Finish {
  private constructor(private readonly internalValue: FinishValue) {}

  static create(value: string): Finish {
    if (!FINISH_VALUES.includes(value as FinishValue)) {
      throw new Error(`Invalid finish: ${value}`);
    }
    return new Finish(value as FinishValue);
  }

  static fromPrisma(value: string): Finish {
    return this.create(value);
  }

  get value(): FinishValue {
    return this.internalValue;
  }
}
