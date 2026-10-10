'use client';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Minus, Plus, Trash2, LockKeyhole } from 'lucide-react';
import { useStore } from './store-provider';
import { money, shippingFee } from '@/lib/utils';
import type { StoreSettings, Product } from '@/lib/types';
export function Bag({ settings, products }: { settings: StoreSettings; products: Product[] }) {
  const { bag, update, ready } = useStore();
  const items = bag.map((i) => {
    const p = products.find((p) => p.id === i.productId);
    return {
      ...i,
      price: p?.price ?? i.price,
      stock: p?.variants.find((v) => v.id === i.variantId)?.stock ?? 0,
    };
  });
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const delivery = shippingFee(subtotal, settings);
  const invalid = items.some((i) => i.stock < i.quantity);
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">GOOD CHOICES START HERE</span>
        <h1>
          Your shopping <em>bag.</em>
        </h1>
        <p>
          {items.length} carefully chosen {items.length === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
      {!ready ? (
        <p>Loading your bag…</p>
      ) : !bag.length ? (
        <div className="empty-state">
          <ShoppingBag size={36} />
          <h2>A little room for something lovely.</h2>
          <p>Your bag is waiting for your next favourite.</p>
          <Link href="/shop" className="button">
            Explore the collection <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <div>
            {items.map((i) => (
              <article className="bag-row" key={i.variantId}>
                <img src={i.image} alt={i.name} />
                <div>
                  <h3>{i.name}</h3>
                  <p>Size: {i.size}</p>
                  <strong>{money(i.price)}</strong>
                  {i.stock < i.quantity && (
                    <p className="form-error">
                      Only {i.stock} available. Update your quantity or remove this item.
                    </p>
                  )}
                  <div className="quantity-control">
                    <button
                      onClick={() => update(i.variantId, i.quantity - 1)}
                      aria-label={`Decrease quantity of ${i.name}`}
                    >
                      <Minus size={13} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      disabled={i.quantity >= Math.min(i.stock, 10)}
                      onClick={() => update(i.variantId, i.quantity + 1)}
                      aria-label={`Increase quantity of ${i.name}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <button
                  className="icon-button remove-item"
                  onClick={() => update(i.variantId, 0)}
                  aria-label={`Remove ${i.name}`}
                >
                  <Trash2 size={17} />
                </button>
                <strong className="bag-line-total">{money(i.price * i.quantity)}</strong>
              </article>
            ))}
            <Link href="/shop" className="text-link">
              Continue exploring <ArrowRight size={15} />
            </Link>
          </div>
          <aside className="order-summary">
            <span className="eyebrow">YOUR ORDER</span>
            <h2>A lovely little edit.</h2>
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
            {subtotal < settings.free_shipping_threshold && (
              <p className="shipping-progress">
                You’re {money(settings.free_shipping_threshold - subtotal)} away from complimentary
                delivery.
              </p>
            )}
            {invalid ? (
              <p className="form-error">Update unavailable items before checkout.</p>
            ) : (
              <Link href="/checkout" className="button full">
                Proceed to checkout <ArrowRight size={17} />
              </Link>
            )}
            <p className="secure-note">
              <LockKeyhole size={14} /> Secure checkout · LKR
            </p>
            <p className="small muted">
              Final prices and availability are checked when you place your order.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
