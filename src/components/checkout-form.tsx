'use client';
import { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Landmark, ArrowRight, LockKeyhole } from 'lucide-react';
import { useStore } from './store-provider';
import { checkout } from '@/app/actions/store';
import { money, shippingFee } from '@/lib/utils';
import type { StoreSettings, Product } from '@/lib/types';
export function CheckoutForm({
  settings,
  products,
  name,
  email,
}: {
  settings: StoreSettings;
  products: Product[];
  name: string;
  email: string;
}) {
  const { bag, clear, ready } = useStore();
  const [payment, setPayment] = useState<'cod' | 'bank_transfer'>('cod');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const requestId = useRef('');
  const router = useRouter();
  const placed = useRef(false);
  const subtotal = bag.reduce(
    (n, i) => n + (products.find((p) => p.id === i.productId)?.price || 0) * i.quantity,
    0,
  );
  const delivery = shippingFee(subtotal, settings);
  const invalid = bag.some((i) => {
    const p = products.find((p) => p.id === i.productId);
    return !p || (p.variants.find((v) => v.id === i.variantId)?.stock || 0) < i.quantity;
  });
  if (!ready) return <p>Loading your bag…</p>;
  if (!bag.length && !placed.current)
    return (
      <div className="empty-state">
        <h2>Your bag is empty.</h2>
        <Link href="/shop" className="button">
          Explore the collection
        </Link>
      </div>
    );
  function submit(form: FormData) {
    if (pending || placed.current) return;
    if (invalid) {
      setError('A selected size is no longer available. Please update your bag.');
      return;
    }
    setError('');
    if (!requestId.current) requestId.current = crypto.randomUUID();
    start(async () => {
      try {
        const result = await checkout({
          items: bag.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          shipping: {
            name: form.get('name'),
            phone: String(form.get('phone')).replace(/[\s-]/g, ''),
            address: form.get('address'),
            city: form.get('city'),
            postal_code: form.get('postal_code'),
            notes: form.get('notes'),
          },
          payment,
          requestId: requestId.current,
        });
        if (result.error) setError(result.error);
        if (result.redirect) {
          placed.current = true;
          clear();
          router.push(result.redirect);
          router.refresh();
        }
      } catch {
        setError(
          'We could not confirm the result. Please retry; your request will not create a duplicate order.',
        );
      }
    });
  }
  return (
    <form action={submit} className="checkout-layout">
      <div className="checkout-fields">
        <div className="form-section-heading">
          <span>01</span>
          <h2>Where shall we send it?</h2>
        </div>
        <p className="muted">Signed in as {email}</p>
        <div className="form-grid">
          <label>
            Full name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              defaultValue={name}
            />
          </label>
          <label>
            Mobile number
            <input
              name="phone"
              required
              type="tel"
              autoComplete="tel"
              placeholder="0771234567"
              maxLength={20}
            />
          </label>
          <label className="span-2">
            Delivery address
            <input
              name="address"
              required
              minLength={8}
              maxLength={300}
              autoComplete="street-address"
              placeholder="House number, street and area"
            />
          </label>
          <label>
            City
            <input
              name="city"
              required
              minLength={2}
              maxLength={100}
              autoComplete="address-level2"
            />
          </label>
          <label>
            Postal code
            <input
              name="postal_code"
              required
              pattern="[0-9]{5}"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
            />
          </label>
          <label className="span-2">
            Delivery notes <span className="muted">(optional)</span>
            <textarea
              name="notes"
              maxLength={500}
              rows={3}
              placeholder="Anything that will help us find you?"
            />
          </label>
        </div>
        <p className="small muted">We currently deliver within Sri Lanka.</p>
        <div className="form-section-heading">
          <span>02</span>
          <h2>Your preferred way to pay.</h2>
        </div>
        <label className={`payment-option ${payment === 'cod' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="payment"
            checked={payment === 'cod'}
            onChange={() => setPayment('cod')}
          />
          <Banknote size={24} />
          <span>
            <strong>Cash on delivery</strong>
            <small>Pay in cash when your order arrives.</small>
          </span>
        </label>
        <label
          className={`payment-option ${payment === 'bank_transfer' ? 'selected' : ''} ${!settings.bank_transfer_enabled ? 'disabled' : ''}`}
        >
          <input
            type="radio"
            name="payment"
            checked={payment === 'bank_transfer'}
            disabled={!settings.bank_transfer_enabled}
            onChange={() => setPayment('bank_transfer')}
          />
          <Landmark size={24} />
          <span>
            <strong>Bank transfer</strong>
            <small>
              {settings.bank_transfer_enabled
                ? 'Transfer to our bank account, then upload your receipt.'
                : 'Available once the store has published its bank details.'}
            </small>
          </span>
        </label>
        {payment === 'bank_transfer' && (
          <div className="notice-panel">
            Bank details and receipt upload will appear on your order page. Our team will verify
            payment before dispatch.
          </div>
        )}
        <label className="check-line">
          <input type="checkbox" required />I agree to the{' '}
          <Link href="/info/terms" target="_blank">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/info/privacy" target="_blank">
            privacy policy
          </Link>
          .
        </label>
      </div>
      <aside className="order-summary">
        <span className="eyebrow">THE FINAL DETAILS</span>
        <h2>Your chosen pieces.</h2>
        {bag.map((i) => (
          <div className="checkout-mini-item" key={i.variantId}>
            <img src={i.image} alt="" />
            <div>
              <strong>{i.name}</strong>
              <span>
                {i.color && i.color !== 'Default' ? `${i.color} · ` : ''}Size {i.size} · Qty{' '}
                {i.quantity}
              </span>
            </div>
            <span>
              {money((products.find((p) => p.id === i.productId)?.price || 0) * i.quantity)}
            </span>
          </div>
        ))}
        <div className="summary-line">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="summary-line">
          <span>Delivery</span>
          <span>{delivery ? money(delivery) : 'Complimentary'}</span>
        </div>
        <div className="summary-line total">
          <span>Total</span>
          <span>{money(subtotal + delivery)}</span>
        </div>
        <p className="small muted">
          Delivery typically takes 2–4 working days after confirmation. Bank transfers require
          approval.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {invalid && (
          <p className="form-error">
            An item is unavailable. <Link href="/bag">Update your bag.</Link>
          </p>
        )}
        <button type="submit" className="button full" disabled={pending || invalid}>
          {pending ? 'Placing your order…' : 'Place order'}
          <ArrowRight size={17} />
        </button>
        <p className="secure-note">
          <LockKeyhole size={14} /> Your details stay private.
        </p>
      </aside>
    </form>
  );
}
