import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { getSettings, getProducts } from '@/lib/data';
import { CheckoutForm } from '@/components/checkout-form';
export const metadata = { title: 'Checkout', robots: { index: false, follow: false } };
export default async function Page() {
  const user = await getViewer();
  if (!user) redirect('/auth?next=/checkout');
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">ALMOST YOURS</span>
        <h1>
          The final <em>details.</em>
        </h1>
      </div>
      <CheckoutForm settings={settings} products={products} name={user.name} email={user.email} />
    </div>
  );
}
