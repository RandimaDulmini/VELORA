'use client';
import { useActionState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/types';
export function ActionForm({
  action,
  children,
  submit = 'Save changes',
  className = '',
  pendingLabel = 'Saving…',
}: {
  action: (state: ActionResult, data: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submit?: string;
  className?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  useEffect(() => {
    if (state.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);
  return (
    <form action={formAction} className={className}>
      <fieldset disabled={pending}>{children}</fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? pendingLabel : submit}
      </button>
    </form>
  );
}
