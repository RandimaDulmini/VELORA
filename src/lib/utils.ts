export const money = (amount: number) =>
  `LKR ${new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(amount)}`;
export const categories = [
  ['all', 'All Products'],
  ['new', 'New Arrivals'],
  ['women', 'Women'],
  ['men', 'Men'],
  ['teen', 'Teen'],
  ['kids', 'Kids'],
  ['accessories', 'Accessories'],
  ['sale', 'Sale'],
] as const;
export const orderNumber = (id: string) => `VL-${id.slice(0, 8).toUpperCase()}`;
export const date = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });
export function safeNext(value: string | null | undefined) {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value))
    return '/account';
  try {
    const url = new URL(value, 'https://velora.invalid');
    return url.origin === 'https://velora.invalid'
      ? `${url.pathname}${url.search}${url.hash}`
      : '/account';
  } catch {
    return '/account';
  }
}
export function shippingFee(
  subtotal: number,
  settings: { shipping_fee: number; free_shipping_threshold: number },
) {
  return subtotal >= settings.free_shipping_threshold ? 0 : Number(settings.shipping_fee);
}
import type { Product, Variant } from './types';

export function visibleVariants(product: Pick<Product, 'variants'>): Variant[] {
  const hasNamedColors = product.variants.some(
    (variant) => variant.color && variant.color !== 'Default',
  );
  return hasNamedColors
    ? product.variants.filter((variant) => variant.color && variant.color !== 'Default')
    : product.variants;
}

export function isMissingOrderReviewSchema(
  error: { code?: string; message?: string } | null | undefined,
) {
  if (!error) return false;
  return (
    ['42703', 'PGRST204'].includes(error.code || '') ||
    /received_at|review_rating|review_text|review_created_at/i.test(error.message || '')
  );
}
