import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient, isConfigured } from './supabase/server';
export const getViewer = cache(async () => {
  if (!isConfigured()) return null;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db
    .from('staff_members')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email!,
    name: String(user.user_metadata?.full_name || ''),
    role: data?.role as 'admin' | 'super_admin' | undefined,
  };
});
export async function requireUser() {
  const user = await getViewer();
  if (!user) redirect('/auth');
  return user;
}
export async function requireStaff(superOnly = false) {
  const user = await requireUser();
  if (!user.role || (superOnly && user.role !== 'super_admin')) redirect('/account');
  return user;
}
