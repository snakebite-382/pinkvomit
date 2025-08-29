import pino from "pino";
import { ID } from "types";

export interface Repository<T> {
  insert(object: Partial<T>): Promise<T | null>;
  update(id: ID, object: Partial<T>, options?: QueryOptions | {}): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  find(object: Partial<T>, options?: QueryOptions): Promise<T[] | null>;
  findOne(object: Partial<T>, options?: QueryOptions): Promise<T | null>;
}

export interface QueryOptions {
  caseSensitive?: boolean;
  operator?: 'LIKE' | '=' | 'ILIKE' | '>' | '<';
  joiner?: " AND " | ", ";
}

export function parsePartial<T>(
  object: Partial<T>,
  validFields: string[],
  options: QueryOptions | {} = {}
): { keyString: string, values: any[] } {
  const { caseSensitive = true, operator = '=', joiner = " AND " } = options as QueryOptions;

  const validEntries = Object.entries(object)
    .filter(([key, value]) => value !== undefined && validFields.includes(key));

  if (validEntries.length === 0) {
    throw new Error('No valid fields to update');
  }

  const keyString = validEntries.map(([key, value]) => {
    if (operator === 'LIKE' || operator === 'ILIKE') {
      return `${key} ${operator} ?`;
    } else if (caseSensitive && typeof value === 'string') {
      return `BINARY ${key} = ?`;
    } else {
      return `${key} = ?`;
    }
  }).join(' AND ');

  const values = validEntries.map(([key, value]) => {
    if (operator === 'LIKE' || operator === 'ILIKE') {
      return `%${value}%`;
    }
    return value;
  });

  return { keyString, values };
}
