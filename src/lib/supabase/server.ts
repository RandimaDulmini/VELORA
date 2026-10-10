import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function isConfigured() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export async function createClient() {
  if (!isConfigured()) throw new Error('Connect Supabase to enable accounts and checkout.');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    // Authentication is entirely server-side; browser JavaScript never needs the session tokens.
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
    cookies: { getAll: () => jar.getAll(), setAll: values => { try { values.forEach(({name,value,options})=>jar.set(name,value,options)); } catch { /* Server components cannot set cookies; proxy handles refresh. */ } } },
  });
}
