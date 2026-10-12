import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import type { StoreSettings } from '@/lib/types';
export function Footer({ settings }: { settings: StoreSettings }) {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '');
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <>
      <footer className="reference-footer">
        <div>
          <Link href="/" className="footer-brand">
            VELORA
          </Link>
          <p>Soft colours, made to be worn.</p>
        </div>
        <div>
          <p>
            Delivery 2–4 working days
            <br />
            Size exchange within 7 days
          </p>
          <Link href="/info/delivery">Delivery & exchange details</Link>
        </div>
        <nav aria-label="Customer help">
          {settings.footer_size_guide_enabled && (
            <Link href="/info/size-guide">{settings.footer_size_guide_label}</Link>
          )}
          {settings.footer_orders_enabled && (
            <Link href="/account">{settings.footer_orders_label}</Link>
          )}
          {settings.footer_contact_enabled && wa ? (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              {settings.footer_contact_label}
            </a>
          ) : settings.footer_contact_enabled && email ? (
            <a href={`mailto:${email}`}>{settings.footer_contact_label}</a>
          ) : settings.footer_contact_enabled ? (
            <Link href="/info/contact">{settings.footer_contact_label}</Link>
          ) : null}
        </nav>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} VELORA. All rights reserved.</span>
          <Link href="/info/privacy">Privacy</Link>
          <Link href="/info/terms">Terms</Link>
          <span>Sri Lanka · LKR</span>
        </div>
      </footer>
      {wa && (
        <div className="reference-floating">
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} />
            Chat on WhatsApp
          </a>
        </div>
      )}
    </>
  );
}
