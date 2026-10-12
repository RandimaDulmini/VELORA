export const PRODUCT_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

const sizePositions = new Map<string, number>(
  PRODUCT_SIZES.map((size, position) => [size, position]),
);

export function compareProductSizes(a: string, b: string) {
  const aPosition = sizePositions.get(a.toUpperCase());
  const bPosition = sizePositions.get(b.toUpperCase());

  if (aPosition !== undefined && bPosition !== undefined) return aPosition - bPosition;
  if (aPosition !== undefined) return -1;
  if (bPosition !== undefined) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
