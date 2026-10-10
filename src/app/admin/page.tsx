import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/data';
import { money, date, orderNumber } from '@/lib/utils';
export default async function Page() {
  await requireStaff();
  const db = await createClient();
  const [products, { data: orders, error }] = await Promise.all([
    getProducts(true),
    db
      .from('orders')
      .select('id,total,status,payment_status,created_at,customer_name')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);
  if (error) throw new Error('Orders could not be loaded.');
  const recent = orders || [];
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Your store, at a glance.</h2>
          <p className="muted">Order metrics cover the latest 200 orders.</p>
        </div>
        <Link href="/admin/products/new" className="button">
          <Plus size={16} />
          Add product
        </Link>
      </div>
      <div className="stats-grid">
        {[
          ['Active products', products.filter((p) => p.active).length],
          ['Orders to confirm', recent.filter((o) => o.status === 'pending').length],
          [
            'Receipts to review',
            recent.filter((o) => o.status === 'pending' && o.payment_status === 'review').length,
          ],
          [
            'Collected revenue',
            money(
              recent
                .filter((o) => o.payment_status === 'paid')
                .reduce((s, o) => s + Number(o.total), 0),
            ),
          ],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="section-heading">
          <h2>Recent orders</h2>
          <Link className="text-link" href="/admin/orders">
            View all <ArrowUpRight size={15} />
          </Link>
        </div>
        {recent.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 8).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="text-link" href={`/admin/orders/${o.id}`}>
                        {orderNumber(o.id)}
                      </Link>
                    </td>
                    <td>{o.customer_name}</td>
                    <td>{date(o.created_at)}</td>
                    <td>
                      <span className={`status-badge ${o.payment_status}`}>{o.payment_status}</span>
                    </td>
                    <td>{money(o.total)}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">New orders will appear here.</p>
        )}
      </div>
      <div className="panel">
        <h2>Stock to watch</h2>
        <p className="muted">Active products with sizes at 3 units or fewer.</p>
        <div className="low-stock-list">
          {products
            .filter((p) => p.active && p.variants.some((v) => v.stock <= 3))
            .map((p) => (
              <Link href={`/admin/products/${p.id}`} key={p.id}>
                {p.name}
                <span>
                  {p.variants
                    .filter((v) => v.stock <= 3)
                    .map((v) => `${v.size}: ${v.stock}`)
                    .join(' · ')}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </>
  );
}
