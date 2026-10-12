import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { StoreProvider } from '@/components/store-provider';
import { getViewer } from '@/lib/auth';
import { getPublicSettings } from '@/lib/data';
import { isConfigured } from '@/lib/supabase/server';
import './globals.css';
import './reference-theme.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'VELORA | Online Clothing Store', template: '%s | VELORA' },
  description:
    'Discover VELORA’s curated collection of imported clothing for women, men, teens and kids. Shop in LKR with delivery across Sri Lanka.',
  openGraph: {
    title: 'VELORA | Clothing & Lifestyle',
    description: 'Soft colours. Considered details. A little more you, every day.',
    images: ['/images/original-hero.jpg'],
  },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [viewer, settings] = await Promise.all([getViewer(), getPublicSettings()]);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Header staff={!!viewer?.role} signedIn={!!viewer} />
          {!isConfigured() && (
            <div className="preview-banner">
              Store preview · Sample catalogue · Accounts, orders and payments become available
              after Supabase setup.
            </div>
          )}
          <main id="main">{children}</main>
          <Footer settings={settings} />
        </StoreProvider>
      </body>
    </html>
  );
}
