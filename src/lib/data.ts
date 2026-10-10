import 'server-only';
import { cache } from 'react';
import sampleProducts from '@/data/products.json';
import { createClient, isConfigured } from './supabase/server';
import type { Product, StoreSettings, Order } from './types';
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
  if (!isConfigured())
    return {
      shipping_fee: 450,
      free_shipping_threshold: 15000,
      bank_name: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_branch: '',
      bank_transfer_enabled: false,
    };
  const { data, error } = await (await createClient()).from('store_settings').select('*').single();
  if (error) throw new Error('Store settings could not be loaded.');
  return data as StoreSettings;
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
