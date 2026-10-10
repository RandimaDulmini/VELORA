import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>This piece is out of sight.</h1>
      <p>The page may have moved or is no longer available.</p>
      <Link href="/shop" className="button">
        Explore the collection
      </Link>
    </div>
  );
}
