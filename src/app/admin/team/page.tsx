import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ActionForm } from '@/components/action-form';
import { changeRole } from '@/app/actions/store';
import { date } from '@/lib/utils';
export default async function Page() {
  await requireStaff(true);
  const db = await createClient();
  const [{ data: members, error }, { data: logs }] = await Promise.all([
    db.from('staff_members').select('*').order('created_at'),
    db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(30),
  ]);
  if (error) throw new Error('Could not load staff.');
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Your store team</h2>
          <p className="muted">Only super admins can grant, change or revoke staff access.</p>
        </div>
      </div>
      <div className="admin-form-grid">
        <section className="panel">
          <h2>Manage access</h2>
          <p>
            Ask the team member to create a customer account and verify their email first, then
            enter that email here.
          </p>
          <ActionForm action={changeRole} submit="Update staff access">
            <label>
              Verified account email
              <input name="email" required type="email" maxLength={254} />
            </label>
            <label>
              Access level
              <select name="role">
                <option value="admin">Admin — products, orders and payments</option>
                <option value="super_admin">
                  Super admin — all access, including team and settings
                </option>
                <option value="remove">Remove staff access</option>
              </select>
            </label>
            <p className="small muted">
              You cannot change your own role. Removing staff access leaves the person’s customer
              account intact.
            </p>
          </ActionForm>
        </section>
        <section className="panel">
          <h2>Current team</h2>
          {members?.map((m) => (
            <div className="team-row" key={m.user_id}>
              <strong>{m.email}</strong>
              <span className="status-badge">{m.role.replace('_', ' ')}</span>
            </div>
          ))}
        </section>
      </div>
      <section className="panel">
        <h2>Recent activity</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log) => (
                <tr key={log.id}>
                  <td>{date(log.created_at)}</td>
                  <td>{log.action.replaceAll('_', ' ')}</td>
                  <td>
                    {members?.find((m) => m.user_id === log.actor_id)?.email ||
                      log.actor_id?.slice(0, 8) ||
                      'System'}
                  </td>
                  <td>{log.target_id?.slice(0, 8) || 'Store'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
