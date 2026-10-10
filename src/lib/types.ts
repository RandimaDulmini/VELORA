export type Variant = { id: string; product_id: string; size: string; stock: number };
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  clothing_type: string;
  price: number;
  compare_at_price: number | null;
  image_url: string;
  image_position: string;
  featured: boolean;
  is_new: boolean;
  active: boolean;
  created_at: string;
  variants: Variant[];
};
export type StoreSettings = {
  shipping_fee: number;
  free_shipping_threshold: number;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  bank_transfer_enabled: boolean;
};
export type Order = {
  id: string;
  user_id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  notes: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: 'cod' | 'bank_transfer';
  payment_status: 'pending' | 'review' | 'paid' | 'rejected';
  payment_note: string;
  receipt_path: string | null;
  bank_details: Pick<
    StoreSettings,
    'bank_name' | 'bank_account_name' | 'bank_account_number' | 'bank_branch'
  > | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  items: {
    id: string;
    product_name: string;
    size: string;
    quantity: number;
    unit_price: number;
    image_url: string;
  }[];
};
export type ActionResult = { error?: string; success?: string; redirect?: string };
