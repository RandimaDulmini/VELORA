import { NextRequest, NextResponse } from 'next/server';
import { createClient, isConfigured } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils';
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (hash && (type === 'email' || type === 'recovery') && isConfigured()) {
    const { error } = await (await createClient()).auth.verifyOtp({ token_hash: hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === 'recovery'
            ? '/auth?mode=update'
            : safeNext(request.nextUrl.searchParams.get('next')),
          request.url,
        ),
      );
  }
  return NextResponse.redirect(new URL('/auth?error=link', request.url));
}
