import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicSettings } from '@/lib/data';
import { money } from '@/lib/utils';
const titles: Record<string, string> = {
  delivery: 'Delivery & exchanges',
  'size-guide': 'Find your fit',
  privacy: 'Your privacy',
  terms: 'Shopping with VELORA',
  contact: 'Here to help',
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: titles[slug] || 'Information' };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!titles[slug]) notFound();
  const s = await getPublicSettings();
  const wa = s.contact_whatsapp.replace(/\D/g, '');
  const phoneHref = s.contact_phone.replace(/[^+\d]/g, '');
  return (
    <div className="info-page">
      <span className="eyebrow">THE LITTLE DETAILS</span>
      <h1>{titles[slug]}</h1>
      {slug === 'delivery' ? (
        <>
          <h2>Across the island</h2>
          <p>
            We deliver within Sri Lanka. Standard delivery is {money(s.shipping_fee)}, with
            complimentary delivery on orders of {money(s.free_shipping_threshold)} or more. Your
            exact delivery fee appears at checkout.
          </p>
          <h2>When to expect your order</h2>
          <p>
            Our usual delivery estimate is 2–4 working days after confirmation. Bank-transfer orders
            are confirmed after our team verifies the payment. Holidays, location and courier
            conditions may affect delivery times.
          </p>
          <h2>Finding the right fit</h2>
          <p>
            Contact us within 7 days of receiving your order if you need a size exchange. Keep the
            garment unworn, unwashed and with its original tags and packaging. Availability and
            return-delivery arrangements will be confirmed by the team before you send an item back.
          </p>
          <h2>Something isn’t right?</h2>
          <p>
            If your order arrives damaged or incorrect, keep the packaging and contact us with your
            order number and photographs so we can arrange a resolution.
          </p>
          <Link href="/info/contact" className="text-link">
            Contact the team
          </Link>
        </>
      ) : slug === 'size-guide' ? (
        <>
          <p>{s.size_guide_intro}</p>
          <div className="table-scroll size-guide-table">
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Bust / chest (cm)</th>
                  <th>Waist (cm)</th>
                  <th>Hips (cm)</th>
                </tr>
              </thead>
              <tbody>
                {s.size_guide_chart.map((row) => (
                  <tr key={`${row.size}-${row.bust}-${row.waist}-${row.hips}`}>
                    <th scope="row">{row.size}</th>
                    <td>{row.bust}</td>
                    <td>{row.waist}</td>
                    <td>{row.hips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>How to measure</h2>
          <div className="measurement-grid">
            <section>
              <h3>Chest / bust</h3>
              <p>Measure around the fullest part, keeping the tape level and comfortably loose.</p>
            </section>
            <section>
              <h3>Waist</h3>
              <p>Measure around your natural waist, without pulling the tape tight.</p>
            </section>
            <section>
              <h3>Hips</h3>
              <p>Stand with your feet together and measure around the fullest part of your hips.</p>
            </section>
          </div>
          <p>
            For children, share age, height and measurements with our team. For a relaxed fit or if
            you are between sizes, ask about the garment’s cut before deciding.
          </p>
          <Link href="/info/contact" className="button">
            Help me find my size
          </Link>
        </>
      ) : slug === 'privacy' ? (
        <>
          <p>
            We use the information you provide to manage your account, process orders, verify bank
            transfers and arrange delivery.
          </p>
          <h2>What we store</h2>
          <p>
            Your account email and name, order details, phone number, delivery address and uploaded
            payment receipts. Authentication is handled through Supabase Auth. Passwords are not
            stored in the website’s application tables.
          </p>
          <h2>Who can access it</h2>
          <p>
            You can view your own orders. Authorised store staff can access order and payment
            information needed to operate the store. Payment receipts are held in private storage
            and opened using temporary links. Couriers receive the delivery details needed to fulfil
            an order.
          </p>
          <h2>Cookies and local storage</h2>
          <p>
            Essential cookies keep you signed in. Your browser stores your shopping bag and
            wishlist. Clearing browser storage removes saved bag and wishlist items.
          </p>
          <h2>Your information</h2>
          <p>
            Contact the team to ask about your personal data, request corrections, or request
            account deletion. Some transaction records may need to be retained for order handling
            and applicable obligations.
          </p>
          <Link href="/info/contact" className="text-link">
            Contact us about privacy
          </Link>
        </>
      ) : slug === 'terms' ? (
        <>
          <h2>Orders and availability</h2>
          <p>
            All prices are in Sri Lankan rupees. Stock and final prices are checked when you place
            an order. Delivery charges are shown before submission. A received order is subject to
            confirmation by the store.
          </p>
          <h2>Payments</h2>
          <p>
            You can pay cash on delivery or, when enabled, by bank transfer. For a transfer, use the
            bank details and reference on your order page and upload a clear receipt. Our team
            checks the actual bank credit before approving your payment and dispatching your items.
          </p>
          <h2>Product information</h2>
          <p>
            Colours may vary by screen. Check the product description and available sizes, and
            contact us for specific garment measurements.
          </p>
          <h2>Changes and cancellations</h2>
          <p>
            Contact us promptly with your order number if you need to change or cancel an order.
            Changes depend on fulfilment status. Paid cancellations and any refunds are handled by
            the store directly; uploading a slip or cancelling a request does not automatically
            issue a bank refund.
          </p>
          <p>
            See <Link href="/info/delivery">delivery & exchanges</Link> for delivery estimates and
            size-exchange information.
          </p>
        </>
      ) : (
        <>
          {s.contact_intro && <p>{s.contact_intro}</p>}
          <div className="contact-details-grid">
            {wa && (
              <section>
                <h2>WhatsApp</h2>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                  {s.contact_whatsapp}
                </a>
              </section>
            )}
            {s.contact_email && (
              <section>
                <h2>Email</h2>
                <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>
              </section>
            )}
            {s.contact_phone && (
              <section>
                <h2>Phone</h2>
                <a href={`tel:${phoneHref}`}>{s.contact_phone}</a>
              </section>
            )}
            {s.contact_hours && (
              <section>
                <h2>Opening hours</h2>
                <p>{s.contact_hours}</p>
              </section>
            )}
            {s.contact_address && (
              <section>
                <h2>Address</h2>
                <p>{s.contact_address}</p>
              </section>
            )}
            {!wa &&
              !s.contact_email &&
              !s.contact_phone &&
              !s.contact_address &&
              !s.contact_hours && (
                <p className="notice-panel">
                  Our contact details will be published here before the store opens.
                </p>
              )}
          </div>
          <h2>Already ordered?</h2>
          <p>
            Check your account for order progress, bank details, receipt uploads and payment review
            updates.
          </p>
          <Link href="/account" className="text-link">
            View my orders
          </Link>
        </>
      )}
    </div>
  );
}
