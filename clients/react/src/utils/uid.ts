import { ulid } from 'ulid';

export function generateId(prefix?: string): string {
  const uid = ulid();

  return !prefix ? uid : `${prefix}_${uid}`;
}
