import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkoutSchema,
  orderReviewSchema,
  productSchema,
  settingsSchema,
  variantsSchema,
} from '../src/lib/schemas';
import {
  isMissingOrderReviewSchema,
  safeNext,
  shippingFee,
  visibleVariants,
} from '../src/lib/utils';
import { MAX_IMAGE_BYTES, validateImageUpload } from '../src/lib/uploads';
import { PRODUCT_SIZES, compareProductSizes } from '../src/lib/sizes';
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
test('order receipt reviews require a rating and a short written review', () => {
  const review = {
    order_id: '20000000-0000-4000-8000-000000000001',
    rating: '5',
    review: 'Everything arrived safely.',
  };
  assert(orderReviewSchema.safeParse(review).success);
  assert(!orderReviewSchema.safeParse({ ...review, rating: '6' }).success);
  assert(!orderReviewSchema.safeParse({ ...review, review: '  ' }).success);
});
test('variants accept colours and reject duplicate colour-size options or invalid inventory', () => {
  assert(
    variantsSchema.safeParse([
      { color: 'Black', size: 'M', stock: 1 },
      { color: 'White', size: 'M', stock: 2 },
    ]).success,
  );
  assert(
    !variantsSchema.safeParse([
      { color: 'Black', size: 'M', stock: 1 },
      { color: 'black', size: 'm', stock: 2 },
    ]).success,
  );
  assert(!variantsSchema.safeParse([{ color: 'Black', size: 'M', stock: -1 }]).success);
  const withoutColor = variantsSchema.parse([{ color: '', size: 'M', stock: 1 }]);
  assert.equal(withoutColor[0].color, 'Default');
  assert.equal(variantsSchema.parse([{ size: 'S', stock: 2 }])[0].color, 'Default');
  assert(!variantsSchema.safeParse([{ size: 'One size', stock: 2 }]).success);
});
test('product sizes have one shared smallest-to-largest order', () => {
  assert.deepEqual(PRODUCT_SIZES, ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
  assert.deepEqual(['XL', 'XXS', 'M', 'XXXL', 'S'].sort(compareProductSizes), [
    'XXS',
    'S',
    'M',
    'XL',
    'XXXL',
  ]);
  const variant = {
    id: '10000000-0000-4000-8000-000000000001',
    product_id: '00000000-0000-4000-8000-000000000001',
    color: 'Default',
    stock: 1,
  };
  assert.deepEqual(
    visibleVariants({
      variants: [
        { ...variant, id: '10000000-0000-4000-8000-000000000003', size: 'XL' },
        { ...variant, id: '10000000-0000-4000-8000-000000000002', size: 'S' },
        { ...variant, size: 'XXS' },
      ],
    }).map(({ size }) => size),
    ['XXS', 'S', 'XL'],
  );
});
test('default colour is hidden when named colours exist but retained for colourless products', () => {
  const fallback = {
    id: '10000000-0000-4000-8000-000000000001',
    product_id: '00000000-0000-4000-8000-000000000001',
    color: 'Default',
    size: 'M',
    stock: 0,
  };
  const black = { ...fallback, id: '10000000-0000-4000-8000-000000000002', color: 'Black' };
  assert.deepEqual(visibleVariants({ variants: [fallback, black] }), [black]);
  assert.deepEqual(visibleVariants({ variants: [fallback] }), [fallback]);
});
test('missing order review database fields are detected for compatibility queries', () => {
  assert(isMissingOrderReviewSchema({ code: '42703', message: 'column does not exist' }));
  assert(isMissingOrderReviewSchema({ message: 'orders.received_at was not found' }));
  assert(!isMissingOrderReviewSchema({ code: '42501', message: 'permission denied' }));
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
test('store footer settings require safe labels and explicit visibility choices', () => {
  const settings = {
    shipping_fee: 450,
    free_shipping_threshold: 15000,
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    bank_transfer_enabled: false,
    footer_size_guide_enabled: true,
    footer_size_guide_label: 'Size guide',
    footer_orders_enabled: true,
    footer_orders_label: 'My orders',
    footer_contact_enabled: false,
    footer_contact_label: 'Contact us',
  };
  assert(settingsSchema.safeParse(settings).success);
  assert(!settingsSchema.safeParse({ ...settings, footer_contact_label: '' }).success);
  assert(!settingsSchema.safeParse({ ...settings, footer_orders_label: 'x'.repeat(41) }).success);
});
test('receipt and product uploads reject oversized files and unsupported formats before submission', () => {
  assert.equal(validateImageUpload({ size: MAX_IMAGE_BYTES, type: 'image/jpeg' }), '');
  assert(validateImageUpload({ size: MAX_IMAGE_BYTES + 1, type: 'image/jpeg' }));
  assert(validateImageUpload({ size: 100, type: 'image/svg+xml' }));
  assert(validateImageUpload({ size: 0, type: 'image/png' }));
});
