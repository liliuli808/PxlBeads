import { ColorCardRecord } from '@pxlbeads/shared';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchColorCards(brand: string): Promise<ColorCardRecord[]> {
  const res = await fetch(`${API_BASE}/data/color-cards.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch color cards: ${res.statusText}`);
  }
  const all: ColorCardRecord[] = await res.json();
  return all.filter((card) => card.brand === brand);
}
