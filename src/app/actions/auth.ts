'use server';
import { redirect } from 'next/navigation';
import { createClient, isConfigured } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils';
import type { ActionResult } from '@/lib/types';
import { z } from 'zod';
export async function authAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  if (!isConfigured())
    return { error: 'Accounts will be available once the store is connected to Supabase.' };
  const mode = String(form.get('mode'));
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  if (!z.email().safeParse(email).success && mode !== 'update')
    return { error: 'Enter a valid email address.' };
  const db = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (mode === 'forgot') {
    await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/auth/callback?next=/auth?mode=update`,
    });
    return {
      success: 'If an account exists, a password reset link has been sent. Check your email.',
    };
  }
  if (password.length > 128 || (mode !== 'login' && password.length < 12))
    return {
      error:
        mode === 'login'
          ? 'Password must be 128 characters or fewer.'
          : 'Use a password between 12 and 128 characters.',
    };
  if (mode === 'login' && !password) return { error: 'Enter your password.' };
  if (mode === 'update') {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: 'Open the password reset link from your email first.' };
    const { error } = await db.auth.updateUser({ password });
    if (error) return { error: 'Unable to update password. Request a new reset link.' };
    return { success: 'Password updated. You can now go to your account.' };
  }
  if (mode === 'register') {
    const name = String(form.get('name') || '').trim();
    if (name.length < 2 || name.length > 100) return { error: 'Enter your full name.' };
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: `${site}/auth/callback` },
    });
    if (error)
      return {
        error:
          'Registration could not be completed. Try again later or sign in if you have an account.',
      };
    return { success: 'Check your email to confirm your account, then sign in.' };
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error)
    return { error: 'Unable to sign in. Check your email, password, and email verification.' };
  redirect(safeNext(String(form.get('next') || '/account')));
}
export async function signOut() {
  if (isConfigured()) await (await createClient()).auth.signOut();
  redirect('/');
}
