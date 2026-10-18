import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { envSchema, CONFIG_KEYS } from './config.js';

/**
 * Keys that are intentionally present in `.env.example` but are not validated
 * by the zod `envSchema`. These are documented extras (e.g. consumed by other
 * tooling or reserved for future use).
 */
const ALLOWED_NON_VALIDATED_EXTRAS: string[] = [];

function parseExampleKeys(content: string): string[] {
  const keys: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

describe('.env.example', () => {
  const examplePath = resolve(process.cwd(), '.env.example');
  const exampleContent = readFileSync(examplePath, 'utf8');
  const exampleKeys = parseExampleKeys(exampleContent);
  const schemaKeys = Object.keys(envSchema.shape);

  it('exports a CONFIG_KEYS array matching the schema shape', () => {
    expect([...CONFIG_KEYS].sort()).toEqual([...schemaKeys].sort());
  });

  it('includes every config schema key', () => {
    const missing = schemaKeys.filter((key) => !exampleKeys.includes(key));
    expect(missing, `Missing keys in .env.example: ${missing.join(', ')}`).toEqual([]);
  });

  it('does not include keys absent from the schema (unless explicitly allowed)', () => {
    const allowed = new Set([...schemaKeys, ...ALLOWED_NON_VALIDATED_EXTRAS]);
    const unexpected = exampleKeys.filter((key) => !allowed.has(key));
    expect(
      unexpected,
      `Unexpected keys in .env.example not in schema: ${unexpected.join(', ')}`,
    ).toEqual([]);
  });

  it('does not contain duplicate keys', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const key of exampleKeys) {
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
    expect(duplicates, `Duplicate keys in .env.example: ${duplicates.join(', ')}`).toEqual([]);
  });
});