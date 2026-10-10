'use client';
import Link from 'next/link';
import { useState } from 'react';
import { money, date, orderNumber } from '@/lib/utils';
import type { Order } from '@/lib/types';
export function AdminOrders({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = orders.filter(
    (o) =>
      (filter === 'all' ||
        (filter === 'review'
          ? o.payment_status === 'review' && o.status === 'pending'
          : filter === 'received'
            ? !!o.received_at
            : filter === 'delivered'
              ? o.status === 'delivered' && !o.received_at
              : o.status === filter)) &&
      `${o.customer_name} ${o.email} ${o.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Orders & payments</h2>
          <p className="muted">
            Review bank slips, confirm orders and manage deliveries. Latest 200 orders.
          </p>
        </div>
      </div>
      <div className="admin-order-filters">
        <input
          placeholder="Search name, email or order ID"
          aria-label="Search orders"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter orders"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            ['all', 'All orders'],
            ['review', 'Payments to review'],
            ['pending', 'Pending'],
            ['confirmed', 'Ready to dispatch'],
            ['shipped', 'Shipped'],
            ['delivered', 'Delivered'],
            ['received', 'Received'],
            ['cancelled', 'Cancelled'],
          ].map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Placed</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link className="text-link" href={`/admin/orders/${o.id}`}>
                    {orderNumber(o.id)}
                  </Link>
                </td>
                <td>
                  {o.customer_name}
                  <small className="table-email">{o.email}</small>
                </td>
                <td>{date(o.created_at)}</td>
                <td>
                  {o.payment_method === 'cod' ? 'Cash on delivery' : 'Bank transfer'}
                  <br />
                  <span className={`status-badge ${o.payment_status}`}>{o.payment_status}</span>
                </td>
                <td>{money(o.total)}</td>
                <td>
                  <span className={`status-badge ${o.received_at ? 'received' : o.status}`}>
                    {o.received_at ? 'received' : o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="muted">No orders match your filters.</p>}
      </div>
    </>
  );
}
