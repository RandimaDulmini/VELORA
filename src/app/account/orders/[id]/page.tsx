import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getOrder } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { OrderView } from '@/components/order-view';
export const metadata = { title: 'Your order', robots: { index: false, follow: false } };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order || order.user_id !== user.id) notFound();
  const { placed } = await searchParams;
  let receiptUrl: string | undefined;
  if (order.receipt_path) {
    const { data } = await (
      await createClient()
    ).storage
      .from('payment-receipts')
      .createSignedUrl(order.receipt_path, 300);
    receiptUrl = data?.signedUrl;
  }
  return (
    <div className="page-shell">
      {placed && (
        <div className="notice-panel success">
          Thank you. Your order has been received.
          {order.payment_method === 'bank_transfer'
            ? ' Follow the bank transfer instructions below to complete your payment.'
            : ' We’ll confirm it before dispatch.'}
        </div>
      )}
      <OrderView order={order} receiptUrl={receiptUrl} />
    </div>
  );
}
