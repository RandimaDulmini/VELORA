import Link from 'next/link';
import { CheckCircle2, Clock, Package, Truck, ArrowUpRight } from 'lucide-react';
import type { Order } from '@/lib/types';
import { date, money, orderNumber } from '@/lib/utils';
import { ActionForm } from './action-form';
import { uploadReceipt, reviewPayment, changeOrderStatus } from '@/app/actions/store';
import { ImageUpload } from './image-upload';
export function OrderView({
  order: o,
  admin = false,
  receiptUrl,
}: {
  order: Order;
  admin?: boolean;
  receiptUrl?: string;
}) {
  const steps = ['pending', 'confirmed', 'shipped', 'delivered'];
  const current = steps.indexOf(o.status);
  return (
    <>
      <div className="order-title">
        <div>
          <span className="eyebrow">{date(o.created_at)}</span>
          <h1>
            Order <em>{orderNumber(o.id)}</em>
          </h1>
        </div>
        <span className={`status-badge ${o.status}`}>{o.status}</span>
      </div>
      {o.status !== 'cancelled' && (
        <div className="order-timeline">
          {steps.map((s, i) => (
            <div key={s} className={i <= current ? 'done' : ''}>
              {i === 0 ? <Clock /> : i === 1 ? <CheckCircle2 /> : i === 2 ? <Truck /> : <Package />}
              <span>
                {s === 'pending'
                  ? 'Order received'
                  : s === 'confirmed'
                    ? 'Confirmed'
                    : s === 'shipped'
                      ? 'On its way'
                      : 'Delivered'}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="checkout-layout">
        <div>
          <section className="panel">
            <h2>Your pieces</h2>
            {o.items.map((i) => (
              <div className="order-item" key={i.id}>
                <img src={i.image_url} alt={i.product_name} />
                <div>
                  <h3>{i.product_name}</h3>
                  <p>
                    {i.color && i.color !== 'Default' ? `${i.color} · ` : ''}Size {i.size} ·
                    Quantity {i.quantity}
                  </p>
                </div>
                <strong>{money(i.unit_price * i.quantity)}</strong>
              </div>
            ))}
          </section>
          <section className="panel">
            <span className="eyebrow">PAYMENT</span>
            <h2>{o.payment_method === 'cod' ? 'Cash on delivery' : 'Bank transfer'}</h2>
            <p>
              Payment status:{' '}
              <span className={`status-badge ${o.payment_status}`}>
                {o.payment_status === 'review' ? 'Under review' : o.payment_status}
              </span>
            </p>
            {o.payment_method === 'cod' ? (
              <p>Please have {money(o.total)} ready when your order arrives.</p>
            ) : (
              <>
                {o.payment_status === 'paid' ? (
                  <div className="notice-panel success">Your bank transfer has been approved.</div>
                ) : o.status === 'cancelled' ? (
                  <div className="notice-panel">
                    This order has been cancelled. Please do not transfer payment.
                  </div>
                ) : (
                  <>
                    <p>
                      Transfer <strong>{money(o.total)}</strong> to the account below. Use{' '}
                      <strong>{orderNumber(o.id)}</strong> as your payment reference.
                    </p>
                    <dl className="bank-details">
                      <dt>Bank</dt>
                      <dd>{o.bank_details?.bank_name}</dd>
                      <dt>Account name</dt>
                      <dd>{o.bank_details?.bank_account_name}</dd>
                      <dt>Account number</dt>
                      <dd>{o.bank_details?.bank_account_number}</dd>
                      <dt>Branch</dt>
                      <dd>{o.bank_details?.bank_branch || '—'}</dd>
                    </dl>
                  </>
                )}
                {o.payment_note && <p className="notice-panel">Payment review: {o.payment_note}</p>}
                {receiptUrl && (
                  <a
                    className="text-link"
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View uploaded receipt <ArrowUpRight size={15} />
                  </a>
                )}
                {!admin &&
                  o.status === 'pending' &&
                  ['pending', 'rejected'].includes(o.payment_status) && (
                    <ActionForm
                      action={uploadReceipt}
                      submit="Upload payment receipt"
                      pendingLabel="Uploading receipt…"
                      className="receipt-form"
                    >
                      <input type="hidden" name="order_id" value={o.id} />
                      <label>
                        Bank transfer receipt
                        <ImageUpload name="receipt" required />
                      </label>
                      <p className="small muted">
                        JPG, PNG or WebP, up to 4 MB. Upload a clear photo or screenshot showing the
                        amount, date and payment reference. Only you and the store team can view it.
                      </p>
                    </ActionForm>
                  )}
                {o.payment_status === 'review' && !admin && (
                  <p className="notice-panel">
                    Your receipt is with our team. This page will show the result once reviewed.
                  </p>
                )}
                {admin && o.payment_status === 'review' && o.status === 'pending' && (
                  <ActionForm action={reviewPayment} submit="Submit payment review">
                    <input type="hidden" name="order_id" value={o.id} />
                    <p className="notice-panel">
                      Check the actual credit in your bank account before approving. A receipt alone
                      is not proof that funds were received.
                    </p>
                    <label>
                      Decision
                      <select name="decision">
                        <option value="approve">Approve payment and confirm order</option>
                        <option value="reject">Reject receipt and request another</option>
                      </select>
                    </label>
                    <label>
                      Customer note
                      <textarea
                        name="note"
                        maxLength={500}
                        placeholder="Required when rejecting a receipt"
                      />
                    </label>
                  </ActionForm>
                )}
              </>
            )}
          </section>
          {admin && (
            <section className="panel">
              <h2>Fulfilment</h2>
              <ActionForm action={changeOrderStatus} submit="Update order">
                <input type="hidden" name="order_id" value={o.id} />
                <label>
                  Order status
                  <select name="status" defaultValue={o.status}>
                    {[
                      o.status,
                      ...(o.status === 'pending'
                        ? ['confirmed', 'cancelled']
                        : o.status === 'confirmed'
                          ? ['shipped', 'cancelled']
                          : o.status === 'shipped'
                            ? ['delivered']
                            : []),
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="small muted">
                  Bank transfers must be approved before confirmation. Cancelling an unpaid order
                  restores its stock. Delivered COD orders are marked paid.
                </p>
              </ActionForm>
            </section>
          )}
        </div>
        <aside>
          <section className="order-summary">
            <h2>Order summary</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{money(o.subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Delivery</span>
              <span>{o.shipping_fee ? money(o.shipping_fee) : 'Complimentary'}</span>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <span>{money(o.total)}</span>
            </div>
            <div className="summary-address">
              <span className="eyebrow">DELIVER TO</span>
              <strong>{o.customer_name}</strong>
              <p>
                {o.address}
                <br />
                {o.city}, {o.postal_code}
                <br />
                Sri Lanka
              </p>
              <p>
                {o.phone}
                <br />
                {o.email}
              </p>
              {o.notes && <p>Note: {o.notes}</p>}
            </div>
          </section>
          <Link href={admin ? '/admin/orders' : '/account'} className="text-link">
            Back to {admin ? 'all orders' : 'your account'}
          </Link>
        </aside>
      </div>
    </>
  );
}
