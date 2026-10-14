import { z } from 'zod';
import { PRODUCT_SIZES } from './sizes';
export const shippingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^(0\d{9}|\+94\d{9})$/, 'Use 07XXXXXXXX or +947XXXXXXXX.'),
  address: z.string().trim().min(8).max(300),
  city: z.string().trim().min(2).max(100),
  postal_code: z.string().regex(/^\d{5}$/, 'Enter a 5-digit Sri Lankan postal code.'),
  notes: z.string().max(500).default(''),
});
export const checkoutSchema = z.object({
  items: z
    .array(z.object({ variant_id: z.uuid(), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(30),
  shipping: shippingSchema,
  payment: z.enum(['cod', 'bank_transfer']),
  requestId: z.uuid(),
});
export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    description: z.string().max(5000),
    category: z.enum(['women', 'men', 'teen', 'kids', 'accessories']),
    clothing_type: z.string().min(1).max(100),
    price: z.coerce.number().positive().max(10000000),
    compare_at_price: z.number().positive().nullable(),
    image_url: z.string().min(1).max(1000),
    featured: z.boolean(),
    is_new: z.boolean(),
    active: z.boolean(),
  })
  .refine((p) => p.compare_at_price === null || p.compare_at_price > p.price, {
    message: 'Original price must be higher than the selling price.',
  });
export const variantsSchema = z
  .array(
    z.object({
      size: z.enum(PRODUCT_SIZES),
      color: z
        .string()
        .trim()
        .max(50)
        .default('')
        .transform((color) => color || 'Default'),
      stock: z.coerce.number().int().min(0).max(100000),
    }),
  )
  .min(1)
  .max(100)
  .refine(
    (rows) =>
      new Set(rows.map((r) => `${r.color.toLocaleLowerCase()}\u0000${r.size.toLocaleLowerCase()}`))
        .size === rows.length,
    'Each colour and size combination must be unique.',
  );
export const orderReviewSchema = z.object({
  order_id: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().trim().min(3, 'Please write a short review.').max(1000),
});
export const settingsSchema = z.object({
  shipping_fee: z.coerce.number().min(0).max(100000),
  free_shipping_threshold: z.coerce.number().min(0).max(10000000),
  bank_name: z.string().max(100),
  bank_account_name: z.string().max(100),
  bank_account_number: z.string().max(50),
  bank_branch: z.string().max(100),
  bank_transfer_enabled: z.boolean(),
  footer_size_guide_enabled: z.boolean(),
  footer_size_guide_label: z.string().trim().min(1).max(40),
  footer_orders_enabled: z.boolean(),
  footer_orders_label: z.string().trim().min(1).max(40),
  footer_contact_enabled: z.boolean(),
  footer_contact_label: z.string().trim().min(1).max(40),
  size_guide_intro: z.string().trim().min(1).max(1000),
  size_guide_chart: z
    .array(
      z.object({
        size: z.string().trim().min(1).max(20),
        bust: z.string().trim().min(1).max(20),
        waist: z.string().trim().min(1).max(20),
        hips: z.string().trim().min(1).max(20),
      }),
    )
    .min(1, 'Add at least one size-chart row.')
    .max(20),
  contact_intro: z.string().trim().max(1000),
  contact_email: z.union([z.literal(''), z.email('Enter a valid contact email address.')]),
  contact_phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => value === '' || /^\+?[0-9 ()-]{7,30}$/.test(value),
      'Enter a valid contact phone number.',
    ),
  contact_whatsapp: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => value === '' || /^\+?[0-9 ()-]{7,30}$/.test(value),
      'Enter a valid WhatsApp number.',
    ),
  contact_address: z.string().trim().max(500),
  contact_hours: z.string().trim().max(300),
});
