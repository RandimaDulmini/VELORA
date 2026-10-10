'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>A small pause.</h1>
      <p>We couldn’t load this page. Please try again in a moment.</p>
      <div className="inline-actions">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="button secondary">
          Return to the store
        </Link>
      </div>
    </div>
  );
}
