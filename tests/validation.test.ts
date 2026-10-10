import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSchema, productSchema, variantsSchema } from '../src/lib/schemas';
import { safeNext, shippingFee } from '../src/lib/utils';
import { MAX_IMAGE_BYTES, validateImageUpload } from '../src/lib/uploads';
const valid = {
  items: [{ variant_id: '10000000-0000-4000-8000-000000000001', quantity: 1 }],
  shipping: {
    name: 'Test Customer',
    phone: '0771234567',
    address: '12 Flower Road',
    city: 'Colombo',
    postal_code: '00700',
    notes: '',
  },
  payment: 'cod',
  requestId: '20000000-0000-4000-8000-000000000001',
};
test('checkout accepts Sri Lankan addresses and both payment methods', () => {
  assert(checkoutSchema.safeParse(valid).success);
  assert(checkoutSchema.safeParse({ ...valid, payment: 'bank_transfer' }).success);
});
test('checkout rejects negative/fractional quantities, unknown payment types and invalid phone/postcode', () => {
  for (const quantity of [0, -1, 1.5, 11])
    assert(
      !checkoutSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity }] }).success,
    );
  assert(!checkoutSchema.safeParse({ ...valid, payment: 'paid' }).success);
  assert(
    !checkoutSchema.safeParse({
      ...valid,
      shipping: { ...valid.shipping, phone: '123', postal_code: 'bad' },
    }).success,
  );
});
test('client supplied totals are not included in checkout payload', () => {
  const parsed = checkoutSchema.parse({ ...valid, total: 1, shipping_fee: 0 });
  assert(!('total' in parsed));
  assert(!('shipping_fee' in parsed));
});
test('variants reject duplicate sizes and invalid inventory', () => {
  assert(
    !variantsSchema.safeParse([
      { size: 'M', stock: 1 },
      { size: 'M', stock: 2 },
    ]).success,
  );
  assert(!variantsSchema.safeParse([{ size: 'M', stock: -1 }]).success);
});
test('sale prices must be below original price', () => {
  const p = {
    name: 'Linen shirt',
    slug: 'linen-shirt',
    description: 'Description',
    category: 'men',
    clothing_type: 'Tops',
    price: 5000,
    compare_at_price: 4000,
    image_url: '/images/test.jpg',
    featured: false,
    is_new: true,
    active: true,
  };
  assert(!productSchema.safeParse(p).success);
  assert(productSchema.safeParse({ ...p, compare_at_price: 6000 }).success);
});
test('redirects stay within the app', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/\n/evil.test',
    '/\t/evil.test',
    'javascript:alert(1)',
    null,
  ])
    assert.equal(safeNext(value), '/account');
  assert.equal(safeNext('/checkout'), '/checkout');
});
test('free delivery threshold includes the exact boundary', () => {
  const settings = { shipping_fee: 450, free_shipping_threshold: 15000 };
  assert.equal(shippingFee(14999, settings), 450);
  assert.equal(shippingFee(15000, settings), 0);
  assert.equal(shippingFee(20000, settings), 0);
});
test('receipt and product uploads reject oversized files and unsupported formats before submission', () => {
  assert.equal(validateImageUpload({ size: MAX_IMAGE_BYTES, type: 'image/jpeg' }), '');
  assert(validateImageUpload({ size: MAX_IMAGE_BYTES + 1, type: 'image/jpeg' }));
  assert(validateImageUpload({ size: 100, type: 'image/svg+xml' }));
  assert(validateImageUpload({ size: 0, type: 'image/png' }));
});
