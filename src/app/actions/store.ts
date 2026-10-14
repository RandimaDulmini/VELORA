'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireStaff } from '@/lib/auth';
import {
  checkoutSchema,
  productSchema,
  variantsSchema,
  settingsSchema,
  orderReviewSchema,
} from '@/lib/schemas';
import { z } from 'zod';
import type { ActionResult } from '@/lib/types';
import sharp from 'sharp';
import { validateImageUpload } from '@/lib/uploads';

function safeDbError(message: string) {
  const allowed = [
    'stock',
    'available',
    'limit',
    'verify',
    'Verify',
    'Invalid',
    'Please',
    'Super admin',
    'Staff access',
    'own role',
    'register',
    'higher',
    'receipt',
    'Receipt',
    'Approve',
    'Paid orders',
    'status change',
    'Complete the bank',
    'received',
    'shipped',
    'review',
  ];
  return allowed.some((s) => message.includes(s))
    ? message
    : 'This change could not be saved. Please check your details and try again.';
}
export async function checkout(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { items, shipping, payment, requestId } = parsed.data;
  const db = await createClient();
  const { data, error } = await db.rpc('place_order', {
    p_items: items,
    p_shipping: shipping,
    p_payment: payment,
    p_request_id: requestId,
  });
  if (error) return { error: safeDbError(error.message) };
  revalidatePath('/');
  revalidatePath('/account');
  return { redirect: `/account/orders/${data}?placed=1` };
}
async function uploadImage(file: File, bucket: string, prefix: string) {
  const validationError = validateImageUpload(file);
  if (validationError) throw new Error(validationError);
  let bytes: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { limitInputPixels: 25_000_000 }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Invalid image format');
    bytes = await sharp(input, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize({ width: 1800, height: 2200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
  } catch {
    throw new Error('This image could not be read. Choose a valid JPG, PNG, or WebP.');
  }
  const path = `${prefix}${crypto.randomUUID()}.webp`;
  const db = await createClient();
  const { error } = await db.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error('Image upload failed. Please try again.');
  return path;
}
export async function uploadReceipt(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(form.get('order_id'));
  if (!z.uuid().safeParse(id).success) return { error: 'Invalid order.' };
  const db = await createClient();
  const { data: order } = await db
    .from('orders')
    .select('id,payment_status,status,payment_method')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (
    !order ||
    order.status !== 'pending' ||
    order.payment_method !== 'bank_transfer' ||
    !['pending', 'rejected'].includes(order.payment_status)
  )
    return { error: 'Receipt upload is not available for this order.' };
  const file = form.get('receipt');
  if (!(file instanceof File) || !file.size) return { error: 'Choose your bank transfer receipt.' };
  try {
    const path = await uploadImage(file, 'payment-receipts', `${user.id}/${id}/`);
    const { error } = await db.rpc('attach_receipt', { p_order_id: id, p_path: path });
    if (error) return { error: safeDbError(error.message) };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/account/orders/${id}`);
  return { success: 'Receipt uploaded. Our team will verify your transfer before dispatch.' };
}
export async function saveProduct(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const db = await createClient();
  const id = String(form.get('id') || '');
  if (id && !z.uuid().safeParse(id).success) return { error: 'Invalid product.' };
  let image = String(form.get('image_url') || '/images/product-placeholder.svg');
  const file = form.get('image');
  if (file instanceof File && file.size) {
    try {
      const path = await uploadImage(file, 'product-images', '');
      image = db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/`;
  if (
    !/^\/images\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|svg)$/.test(image) &&
    !image.startsWith(allowedPrefix)
  )
    return { error: 'Upload a product image using the image field.' };
  const parsed = productSchema.safeParse({
    name: form.get('name'),
    slug: form.get('slug'),
    description: form.get('description'),
    category: form.get('category'),
    clothing_type: form.get('clothing_type'),
    price: form.get('price'),
    compare_at_price: form.get('compare_at_price') ? Number(form.get('compare_at_price')) : null,
    image_url: image,
    featured: form.get('featured') === 'on',
    is_new: form.get('is_new') === 'on',
    active: form.get('active') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('variants')));
  } catch {
    return { error: 'Invalid inventory data.' };
  }
  const variants = variantsSchema.safeParse(raw);
  if (!variants.success) return { error: variants.error.issues[0].message };
  const { error } = await db.rpc('save_product', {
    p_id: id || null,
    p_product: parsed.data,
    p_variants: variants.data,
  });
  if (error)
    return {
      error:
        error.code === '23505'
          ? 'This URL slug is already used by another product.'
          : safeDbError(error.message),
    };
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/admin');
  return { success: 'Product saved.', redirect: '/admin/products' };
}
export async function changeRole(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(true);
  const email = String(form.get('email') || '').trim();
  const role = String(form.get('role'));
  if (!z.email().safeParse(email).success || !['admin', 'super_admin', 'remove'].includes(role))
    return { error: 'Enter a valid email and role.' };
  const { error } = await (
    await createClient()
  ).rpc('set_staff_role', { p_email: email, p_role: role });
  if (error) return { error: safeDbError(error.message) };
  revalidatePath('/admin/team');
  return { success: 'Staff access updated.' };
}
export async function changeOrderStatus(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('order_id'));
  const status = String(form.get('status'));
  if (
    !z.uuid().safeParse(id).success ||
    !['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)
  )
    return { error: 'Invalid order status.' };
  const { error } = await (
    await createClient()
  ).rpc('update_order_status', { p_id: id, p_status: status });
  if (error) return { error: safeDbError(error.message) };
  revalidatePath('/admin');
  revalidatePath(`/account/orders/${id}`);
  return { success: 'Order updated.' };
}
export async function reviewPayment(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('order_id'));
  const approve = form.get('decision') === 'approve';
  const note = String(form.get('note') || '');
  if (!z.uuid().safeParse(id).success || note.length > 500 || (!approve && note.trim().length < 3))
    return { error: 'Give a short reason when rejecting a receipt.' };
  const { error } = await (
    await createClient()
  ).rpc('review_payment', { p_order_id: id, p_approve: approve, p_note: note });
  if (error) return { error: safeDbError(error.message) };
  revalidatePath('/admin');
  revalidatePath(`/account/orders/${id}`);
  return {
    success: approve
      ? 'Payment approved. This order is ready to dispatch.'
      : 'Receipt rejected. The customer can upload a new receipt.',
  };
}
export async function confirmOrderReceived(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireUser();
  const parsed = orderReviewSchema.safeParse({
    order_id: form.get('order_id'),
    rating: form.get('rating'),
    review: form.get('review'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await (
    await createClient()
  ).rpc('confirm_order_received', {
    p_order_id: parsed.data.order_id,
    p_rating: parsed.data.rating,
    p_review: parsed.data.review,
  });
  if (
    error &&
    (['42883', 'PGRST202'].includes(error.code || '') ||
      /confirm_order_received/i.test(error.message))
  ) {
    return {
      error: 'Order confirmation is temporarily unavailable. Please contact the store.',
    };
  }
  if (error) return { error: safeDbError(error.message) };
  revalidatePath('/account');
  revalidatePath(`/account/orders/${parsed.data.order_id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${parsed.data.order_id}`);
  return { redirect: `/account/orders/${parsed.data.order_id}?received=1` };
}
export async function saveSettings(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff(true);
  const sizes = form.getAll('size_chart_size');
  const busts = form.getAll('size_chart_bust');
  const waists = form.getAll('size_chart_waist');
  const hips = form.getAll('size_chart_hips');
  const sizeGuideChart = sizes.map((size, index) => ({
    size,
    bust: busts[index],
    waist: waists[index],
    hips: hips[index],
  }));
  const parsed = settingsSchema.safeParse({
    ...Object.fromEntries(form),
    bank_transfer_enabled: form.get('bank_transfer_enabled') === 'on',
    footer_size_guide_enabled: form.get('footer_size_guide_enabled') === 'on',
    footer_orders_enabled: form.get('footer_orders_enabled') === 'on',
    footer_contact_enabled: form.get('footer_contact_enabled') === 'on',
    size_guide_chart: sizeGuideChart,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await (
    await createClient()
  ).rpc('save_store_settings', { p_settings: parsed.data });
  if (error) return { error: safeDbError(error.message) };
  revalidatePath('/', 'layout');
  return { success: 'Store settings saved.' };
}
