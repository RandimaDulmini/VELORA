import { requireStaff } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { ActionForm } from '@/components/action-form';
import { saveSettings } from '@/app/actions/store';
export default async function Page() {
  await requireStaff(true);
  const s = await getSettings();
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>The details that keep things moving.</h2>
          <p className="muted">Store settings are available to super admins only.</p>
        </div>
      </div>
      <ActionForm action={saveSettings} submit="Save store settings">
        <div className="admin-form-grid">
          <section className="panel">
            <h2>Delivery</h2>
            <label>
              Standard delivery fee (LKR)
              <input
                name="shipping_fee"
                required
                type="number"
                min={0}
                max={100000}
                step="0.01"
                defaultValue={s.shipping_fee}
              />
            </label>
            <label>
              Free delivery from (LKR)
              <input
                name="free_shipping_threshold"
                required
                type="number"
                min={0}
                max={10000000}
                step="0.01"
                defaultValue={s.free_shipping_threshold}
              />
            </label>
            <p className="small muted">
              Orders at or above this total qualify for free delivery. Set the threshold to zero for
              free delivery on all orders.
            </p>
          </section>
          <section className="panel">
            <h2>Bank transfer</h2>
            <label>
              Bank name
              <input name="bank_name" maxLength={100} defaultValue={s.bank_name} />
            </label>
            <label>
              Account holder name
              <input name="bank_account_name" maxLength={100} defaultValue={s.bank_account_name} />
            </label>
            <label>
              Account number
              <input
                name="bank_account_number"
                maxLength={50}
                defaultValue={s.bank_account_number}
              />
            </label>
            <label>
              Branch
              <input name="bank_branch" maxLength={100} defaultValue={s.bank_branch} />
            </label>
            <label className="check-line">
              <input
                name="bank_transfer_enabled"
                type="checkbox"
                defaultChecked={s.bank_transfer_enabled}
              />
              Accept bank transfer orders
            </label>
            <p className="small muted">
              These details are shown to customers. Existing orders keep the bank details recorded
              at checkout.
            </p>
          </section>
        </div>
      </ActionForm>
    </>
  );
}
