import { useQuery } from '@tanstack/react-query';
import { BrandColor } from '@pxlbeads/shared';
import { fetchColorCards } from '../api/client';
import { hexToRgb } from '../engine/colorSpace';

export function useColorCards(brand: string) {
  return useQuery({
    queryKey: ['color-cards', brand],
    queryFn: async () => {
      const records = await fetchColorCards(brand);
      return records.map(
        (record): BrandColor => ({
          brand: record.brand,
          code: record.code,
          name: record.name ?? undefined,
          rgb: hexToRgb(record.rgbHex),
          lab: [record.labL, record.labA, record.labB],
        })
      );
    },
    enabled: Boolean(brand),
  });
}
