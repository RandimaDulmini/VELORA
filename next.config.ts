import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: 4_400_000 } },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://tagmanager.google.com" +
              (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.googletagmanager.com https://tagmanager.google.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://www.googletagmanager.com https://ssl.gstatic.com https://www.gstatic.com https://*.google-analytics.com https://*.google.com https://*.g.doubleclick.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google.com https://*.g.doubleclick.net https://pagead2.googlesyndication.com; frame-src https://www.googletagmanager.com https://tagmanager.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
