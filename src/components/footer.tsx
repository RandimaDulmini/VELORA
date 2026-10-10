import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
export function Footer() {
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
          <Link href="/info/size-guide">Size guide</Link>
          <Link href="/account">My orders</Link>
          {wa ? (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              Order help: WhatsApp us
            </a>
          ) : email ? (
            <a href={`mailto:${email}`}>Email us for order help</a>
          ) : (
            <Link href="/info/contact">Contact us</Link>
          )}
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
