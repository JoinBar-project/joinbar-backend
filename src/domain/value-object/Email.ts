import { z } from 'zod';

export class Email {
  private constructor(private readonly value: string) {}

  static of(value: string): Email {
    if (!z.string().email().safeParse(value).success) {
      throw new Error('Invalid email format');
    }
    return new Email(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.toString();
  }
}
