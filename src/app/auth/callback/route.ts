import { NextRequest, NextResponse } from 'next/server';
import { createClient, isConfigured } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code && isConfigured()) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url),
      );
  }
  return NextResponse.redirect(new URL('/auth?error=link', request.url));
}
