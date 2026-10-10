import { AuthForm } from '@/components/auth-form';
import { safeNext } from '@/lib/utils';
export const metadata = { title: 'Your account', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const p = await searchParams;
  return <AuthForm next={safeNext(p.next)} mode={p.mode || 'login'} error={p.error} />;
}
