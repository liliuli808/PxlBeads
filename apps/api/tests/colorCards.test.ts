import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';

describe('color cards API', () => {
  let baseUrl: string;

  beforeAll(async () => {
    baseUrl = await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns Perler color cards with Lab values', async () => {
    const res = await fetch(`${baseUrl}/api/color-cards?brand=perler`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('labL');
    expect(data[0]).toHaveProperty('labA');
    expect(data[0]).toHaveProperty('labB');
    expect(data[0]).toHaveProperty('rgbHex');
  });

  it('returns empty array for unknown brand', async () => {
    const res = await fetch(`${baseUrl}/api/color-cards?brand=unknown`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it('returns 400 when brand is missing', async () => {
    const res = await fetch(`${baseUrl}/api/color-cards`);
    expect(res.status).toBe(400);
  });
});
