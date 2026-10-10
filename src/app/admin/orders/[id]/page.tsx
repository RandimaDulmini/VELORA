import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { getOrder } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { OrderView } from '@/components/order-view';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  let receiptUrl: string | undefined;
  if (order.receipt_path) {
    const { data } = await (
      await createClient()
    ).storage
      .from('payment-receipts')
      .createSignedUrl(order.receipt_path, 300);
    receiptUrl = data?.signedUrl;
  }
  return <OrderView order={order} admin receiptUrl={receiptUrl} />;
}
