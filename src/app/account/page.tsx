import Link from 'next/link';
import { Package, ArrowUpRight, LogOut } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { money, date, isMissingOrderReviewSchema, orderNumber } from '@/lib/utils';
export const metadata = { title: 'My account', robots: { index: false, follow: false } };
export default async function Page() {
  const user = await requireUser();
  const db = await createClient();
  let { data: orders, error } = await db
    .from('orders')
    .select('id,created_at,total,status,payment_status,received_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (isMissingOrderReviewSchema(error)) {
    const legacy = await db
      .from('orders')
      .select('id,created_at,total,status,payment_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    orders = legacy.data?.map((order) => ({ ...order, received_at: null })) ?? null;
    error = legacy.error;
  }
  if (error) throw new Error('Could not load orders.');
  return (
    <div className="page-shell">
      <div className="section-heading page-heading">
        <div>
          <span className="eyebrow">YOUR VELORA</span>
          <h1>
            Hello, <em>{user.name.split(' ')[0] || 'there'}.</em>
          </h1>
          <p>{user.email}</p>
        </div>
        <div className="inline-actions">
          {user.role && (
            <Link className="button secondary" href="/admin">
              Store management <ArrowUpRight size={15} />
            </Link>
          )}
          <form action={signOut}>
            <button className="text-link">
              Sign out <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
      <h2>Your orders</h2>
      {orders?.length ? (
        <div className="order-list">
          {orders.map((o) => (
            <Link className="order-list-row" key={o.id} href={`/account/orders/${o.id}`}>
              <Package size={24} />
              <div>
                <strong>{orderNumber(o.id)}</strong>
                <span>{date(o.created_at)}</span>
              </div>
              <span className={`status-badge ${o.received_at ? 'received' : o.status}`}>
                {o.received_at ? 'received' : o.status}
              </span>
              <span>{money(o.total)}</span>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Package size={35} />
          <h2>Your story starts with a first favourite.</h2>
          <p>Your orders will appear here once you’ve checked out.</p>
          <Link href="/shop" className="button">
            Discover the collection
          </Link>
        </div>
      )}
    </div>
  );
}
