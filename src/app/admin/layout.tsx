import { requireStaff } from '@/lib/auth';
import { AdminNav } from '@/components/admin-nav';
export const metadata = { title: 'Store management', robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="admin-shell">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">VELORA / BACK OFFICE</span>
          <h1>Store management</h1>
        </div>
        <span className="status-badge">
          {user.role === 'super_admin' ? 'Super admin' : 'Admin'}
        </span>
      </div>
      <AdminNav superAdmin={user.role === 'super_admin'} />
      <div className="admin-content">{children}</div>
    </div>
  );
}
