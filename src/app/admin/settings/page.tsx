import { requireStaff } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { ActionForm } from '@/components/action-form';
import { saveSettings } from '@/app/actions/store';
import { SizeChartFields } from '@/components/size-chart-fields';
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
          <section className="panel span-2">
            <h2>Customer footer links</h2>
            <p className="muted">
              Choose which customer links appear in the footer and how their labels are displayed.
            </p>
            <div className="form-grid">
              <div className="footer-link-setting">
                <label>
                  Size guide label
                  <input
                    name="footer_size_guide_label"
                    required
                    maxLength={40}
                    defaultValue={s.footer_size_guide_label}
                  />
                </label>
                <label className="check-line">
                  <input
                    name="footer_size_guide_enabled"
                    type="checkbox"
                    defaultChecked={s.footer_size_guide_enabled}
                  />
                  Show in footer
                </label>
              </div>
              <div className="footer-link-setting">
                <label>
                  Orders label
                  <input
                    name="footer_orders_label"
                    required
                    maxLength={40}
                    defaultValue={s.footer_orders_label}
                  />
                </label>
                <label className="check-line">
                  <input
                    name="footer_orders_enabled"
                    type="checkbox"
                    defaultChecked={s.footer_orders_enabled}
                  />
                  Show in footer
                </label>
              </div>
              <div className="footer-link-setting">
                <label>
                  Contact label
                  <input
                    name="footer_contact_label"
                    required
                    maxLength={40}
                    defaultValue={s.footer_contact_label}
                  />
                </label>
                <label className="check-line">
                  <input
                    name="footer_contact_enabled"
                    type="checkbox"
                    defaultChecked={s.footer_contact_enabled}
                  />
                  Show in footer
                </label>
              </div>
            </div>
          </section>
          <section className="panel span-2">
            <h2>Size guide content</h2>
            <p className="muted">
              This information appears on the customer Size Guide page. Measurements are in
              centimetres.
            </p>
            <label>
              Introduction
              <textarea
                name="size_guide_intro"
                required
                maxLength={1000}
                rows={3}
                defaultValue={s.size_guide_intro}
              />
            </label>
            <SizeChartFields initialRows={s.size_guide_chart} />
          </section>
          <section className="panel span-2">
            <h2>Contact details</h2>
            <p className="muted">
              Add the details customers should see after opening the Contact link. Leave an optional
              field empty to hide it.
            </p>
            <label>
              Contact-page message
              <textarea
                name="contact_intro"
                maxLength={1000}
                rows={3}
                defaultValue={s.contact_intro}
              />
            </label>
            <div className="form-grid settings-contact-grid">
              <label>
                Email address
                <input
                  name="contact_email"
                  type="email"
                  maxLength={254}
                  placeholder="hello@example.com"
                  defaultValue={s.contact_email}
                />
              </label>
              <label>
                Phone number
                <input
                  name="contact_phone"
                  type="tel"
                  maxLength={30}
                  placeholder="+94 77 123 4567"
                  defaultValue={s.contact_phone}
                />
              </label>
              <label>
                WhatsApp number
                <input
                  name="contact_whatsapp"
                  type="tel"
                  maxLength={30}
                  placeholder="+94 77 123 4567"
                  defaultValue={s.contact_whatsapp}
                />
              </label>
              <label>
                Opening hours
                <textarea
                  name="contact_hours"
                  maxLength={300}
                  rows={3}
                  placeholder="Monday–Saturday, 9:00 AM–6:00 PM"
                  defaultValue={s.contact_hours}
                />
              </label>
              <label className="span-2">
                Address
                <textarea
                  name="contact_address"
                  maxLength={500}
                  rows={3}
                  placeholder="Your shop or office address"
                  defaultValue={s.contact_address}
                />
              </label>
            </div>
          </section>
        </div>
      </ActionForm>
    </>
  );
}
