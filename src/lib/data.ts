import 'server-only';
import { cache } from 'react';
import sampleProducts from '@/data/products.json';
import { createClient, isConfigured } from './supabase/server';
import type { Product, StoreSettings, Order } from './types';
const defaultSettings: StoreSettings = {
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
  footer_contact_enabled: true,
  footer_contact_label: 'Contact us',
  size_guide_intro:
    'Use this chart as a general guide. Product measurements and fit can vary by style, so contact us if you need help choosing.',
  size_guide_chart: [
    { size: 'XS', bust: '81–84', waist: '63–66', hips: '86–89' },
    { size: 'S', bust: '86–89', waist: '68–71', hips: '91–94' },
    { size: 'M', bust: '91–94', waist: '73–76', hips: '96–99' },
    { size: 'L', bust: '96–101', waist: '78–83', hips: '101–106' },
    { size: 'XL', bust: '103–108', waist: '85–90', hips: '108–113' },
    { size: 'XXL', bust: '110–116', waist: '92–98', hips: '115–121' },
  ],
  contact_intro:
    'Questions about your fit, a piece you love, or an order? Get in touch and include your order number if you have one.',
  contact_email: '',
  contact_phone: '',
  contact_whatsapp: '',
  contact_address: '',
  contact_hours: '',
};
export const getProducts = cache(async (includeHidden = false): Promise<Product[]> => {
  if (!isConfigured()) return sampleProducts as Product[];
  const db = await createClient();
  let query = db
    .from('products')
    .select('*, variants:product_variants(*)')
    .order('created_at', { ascending: false });
  if (!includeHidden) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error('The catalogue could not be loaded. Please try again.');
  return data as Product[];
});
export const getSettings = cache(async (): Promise<StoreSettings> => {
  if (!isConfigured()) return defaultSettings;
  const { data, error } = await (await createClient()).from('store_settings').select('*').single();
  if (error) throw new Error('Store settings could not be loaded.');
  return { ...defaultSettings, ...data } as StoreSettings;
});
export const getPublicSettings = cache(async (): Promise<StoreSettings> => {
  if (!isConfigured()) return defaultSettings;
  try {
    const db = await createClient();
    const { data, error } = await db
      .from('store_settings')
      .select('*')
      .abortSignal(AbortSignal.timeout(3000))
      .single();
    if (error || !data) return defaultSettings;
    return { ...defaultSettings, ...data } as StoreSettings;
  } catch {
    return defaultSettings;
  }
});
export async function getOrders(): Promise<Order[]> {
  const { data, error } = await (
    await createClient()
  )
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('Orders could not be loaded.');
  return data as Order[];
}
export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const { data, error } = await (
    await createClient()
  )
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Order could not be loaded.');
  return data as Order | null;
}
