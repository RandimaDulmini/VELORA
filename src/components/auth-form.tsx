'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authAction } from '@/app/actions/auth';
import { ActionForm } from './action-form';
export function AuthForm({
  next,
  mode: initialMode,
  error,
}: {
  next: string;
  mode: string;
  error?: string;
}) {
  const [mode, setMode] = useState(
    initialMode === 'update' ? 'update' : initialMode === 'forgot' ? 'forgot' : 'login',
  );
  const [showPassword, setShowPassword] = useState(false);
  const changeMode = (nextMode: string) => {
    setShowPassword(false);
    setMode(nextMode);
  };
  return (
    <div className="auth-layout">
      <div className="auth-art">
        <img src="/images/rose-satin-wrap-dress.jpg" alt="Rose satin wrap dress from VELORA" />
        <div>
          <span className="eyebrow">YOUR VERY OWN VELORA</span>
          <h2>
            Good style.
            <br />
            <em>Great to see you.</em>
          </h2>
        </div>
      </div>
      <div className="auth-panel">
        <span className="eyebrow">A LITTLE MORE YOU</span>
        <h1>
          {mode === 'register'
            ? 'Join the collection.'
            : mode === 'forgot'
              ? 'A fresh start.'
              : mode === 'update'
                ? 'Your new password.'
                : 'Welcome back.'}
        </h1>
        <p className="muted">
          {mode === 'register'
            ? 'Create your account to shop and keep track of every order.'
            : mode === 'forgot'
              ? 'We’ll email you a link to reset your password.'
              : mode === 'update'
                ? 'Choose a strong password you don’t use elsewhere.'
                : 'Sign in to discover your favourites and follow your orders.'}
        </p>
        {error && (
          <p className="form-error">
            This email link is invalid or has expired. Request a new link.
          </p>
        )}
        <ActionForm
          key={mode}
          action={authAction}
          submit={
            mode === 'register'
              ? 'Create account'
              : mode === 'forgot'
                ? 'Send reset link'
                : mode === 'update'
                  ? 'Update password'
                  : 'Sign in'
          }
          pendingLabel="Please wait…"
          className="auth-form"
        >
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="next" value={next} />
          {mode === 'register' && (
            <label>
              Full name
              <input name="name" required autoComplete="name" minLength={2} maxLength={100} />
            </label>
          )}
          {mode !== 'update' && (
            <label>
              Email address
              <input type="email" name="email" required autoComplete="email" maxLength={254} />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'login' ? 1 : 12}
                  maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode !== 'login' && <small>At least 12 characters.</small>}
            </label>
          )}
          {mode === 'register' && (
            <label className="check-line">
              <input required type="checkbox" />I agree to the <Link href="/info/terms">terms</Link>{' '}
              and <Link href="/info/privacy">privacy policy</Link>.
            </label>
          )}
        </ActionForm>
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              <button onClick={() => changeMode('forgot')} className="text-link">
                Forgot your password?
              </button>
              <p>
                New to VELORA?{' '}
                <button onClick={() => changeMode('register')} className="text-link">
                  Create an account
                </button>
              </p>
            </>
          ) : mode === 'update' ? (
            <Link href="/account" className="text-link">
              Go to your account
            </Link>
          ) : (
            <button onClick={() => changeMode('login')} className="text-link">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
