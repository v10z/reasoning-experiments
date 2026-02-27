import { randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}

let deterministicCounter = 0;
let deterministicPrefix = 'test';

export function setDeterministicMode(prefix: string = 'test'): void {
  deterministicCounter = 0;
  deterministicPrefix = prefix;
}

export function generateDeterministicId(): string {
  return `${deterministicPrefix}-${String(++deterministicCounter).padStart(4, '0')}`;
}
