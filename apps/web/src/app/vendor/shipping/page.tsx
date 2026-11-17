'use client';

import { useState } from 'react';
import { useVendorPanel } from '@/components/VendorShell';
import { ErrorBox, Field } from '@/components/ui';
import { sellsAlcohol, shippingComplete, type PickupPoint, type ShippingOption, type VendorPanel } from '@/lib/vendor-panel';
import { DoneChip, SavedNote, useAction } from '../_parts/forms';

type Shipping = VendorPanel['shipping'];

const th: React.CSSProperties = { fontSize: 12, textTransform: 'none', letterSpacing: 0, fontWeight: 600, padding: 8 };
const td: React.CSSProperties = { padding: '10px 8px' };

const emptyOption = (): ShippingOption => ({ id: `o-${Date.now()}`, zone: '', option: '', cost: '', deliveryTime: '', freeFrom: '' });
const emptyPickup = (): PickupPoint => ({ id: `pp-${Date.now()}`, name: '', address: '', hours: '' });

function OptionEditor({ value, onDone, onCancel, onRemove }: {
  value: ShippingOption;
  onDone: (o: ShippingOption) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [o, setO] = useState(value);
  const set = (k: keyof ShippingOption) => (e: React.ChangeEvent<HTMLInputElement>) => setO({ ...o, [k]: e.target.value });
  return (
    <div className="stack" style={{ gap: 12, padding: 12, border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)' }}>
      <div className="form-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Field label="Zone" htmlFor="opt-zone" required>
          <input id="opt-zone" type="text" placeholder="Germany" value={o.zone} onChange={set('zone')} />
        </Field>
        <Field label="Option" htmlFor="opt-name" required>
          <input id="opt-name" type="text" placeholder="Standard" value={o.option} onChange={set('option')} />
        </Field>
        <Field label="Cost (€)" htmlFor="opt-cost" required>
          <input id="opt-cost" type="text" inputMode="decimal" value={o.cost} onChange={set('cost')} />
        </Field>
        <Field label="Delivery time" htmlFor="opt-time" required>
          <input id="opt-time" type="text" placeholder="2–4 days" value={o.deliveryTime} onChange={set('deliveryTime')} />
        </Field>
        <Field label="Free from (€)" htmlFor="opt-free">
          <input id="opt-free" type="text" inputMode="decimal" value={o.freeFrom} onChange={set('freeFrom')} />
        </Field>
      </div>
      <div className="row">
        <button type="button" className="btn btn-small btn-primary" disabled={!o.zone.trim() || !o.option.trim()} onClick={() => onDone(o)}>
          Done
        </button>
        <button type="button" className="btn btn-small" onClick={onCancel}>
          Cancel
        </button>
        {onRemove && (
          <button type="button" className="btn btn-small btn-danger" onClick={onRemove}>
            Remove option
          </button>
        )}
      </div>
    </div>
  );
}

function PickupEditor({ value, onDone, onCancel, onRemove }: {
  value: PickupPoint;
  onDone: (p: PickupPoint) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [p, setP] = useState(value);
  const set = (k: keyof PickupPoint) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });
  return (
    <div className="stack" style={{ gap: 12, padding: 12, border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)' }}>
      <div className="form-grid" style={{ gap: 12 }}>
        <Field label="Name" htmlFor="pp-name" required>
          <input id="pp-name" type="text" value={p.name} onChange={set('name')} />
        </Field>
        <Field label="Address" htmlFor="pp-address" required>
          <input id="pp-address" type="text" value={p.address} onChange={set('address')} />
        </Field>
        <Field label="Opening hours" htmlFor="pp-hours" required>
          <input id="pp-hours" type="text" value={p.hours} onChange={set('hours')} />
        </Field>
      </div>
      <div className="row">
        <button type="button" className="btn btn-small btn-primary" disabled={!p.name.trim() || !p.address.trim()} onClick={() => onDone(p)}>
          Done
        </button>
        <button type="button" className="btn btn-small" onClick={onCancel}>
          Cancel
        </button>
        {onRemove && (
          <button type="button" className="btn btn-small btn-danger" onClick={onRemove}>
            Remove pickup point
          </button>
        )}
      </div>
    </div>
  );
}

export default function VendorShippingPage() {
  const { panel, save } = useVendorPanel();
  const [draft, setDraft] = useState<Shipping>(panel.shipping);
  const [editDispatch, setEditDispatch] = useState(false);
  const [editReturns, setEditReturns] = useState(false);
  const [editOption, setEditOption] = useState<string | null>(null);
  const [newOption, setNewOption] = useState<ShippingOption | null>(null);
  const [editPickup, setEditPickup] = useState<string | null>(null);
  const [newPickup, setNewPickup] = useState<PickupPoint | null>(null);
  const action = useAction();
  const alcohol = sellsAlcohol(panel);

  const update = (patch: Partial<Shipping>) => {
    setDraft((d) => ({ ...d, ...patch }));
    action.clearSaved();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void action.run(() => save('/vendor/shipping', draft));
  };

  return (
    <form className="vendor-page" style={{ maxWidth: 860 }} onSubmit={submit}>
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>Shipping</h1>
          <p className="lead">How and where you send orders. Customers see this on your shop page.</p>
        </div>
        <DoneChip done={shippingComplete(panel)} />
      </div>

      <section className="card stack" style={{ gap: 12 }}>
        <h2>Addresses</h2>
        <div className="form-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="row-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ships from</div>
            {editDispatch ? (
              <Field label="Dispatch address" htmlFor="dispatch" required>
                <input
                  id="dispatch"
                  type="text"
                  value={draft.dispatchAddress}
                  onChange={(e) => update({ dispatchAddress: e.target.value })}
                />
              </Field>
            ) : (
              <div className="muted" style={{ fontSize: 14 }}>
                {draft.dispatchSameAsBusiness ? 'Same as business address' : draft.dispatchAddress || 'No address yet'}
              </div>
            )}
            <span>
              {draft.dispatchSameAsBusiness ? (
                <button
                  type="button"
                  className="link-button small"
                  onClick={() => {
                    update({ dispatchSameAsBusiness: false });
                    setEditDispatch(true);
                  }}
                >
                  Use a different dispatch address
                </button>
              ) : (
                <span className="row" style={{ gap: 12 }}>
                  {!editDispatch && (
                    <button type="button" className="link-button small" onClick={() => setEditDispatch(true)}>
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="link-button small"
                    onClick={() => {
                      update({ dispatchSameAsBusiness: true });
                      setEditDispatch(false);
                    }}
                  >
                    Use business address
                  </button>
                </span>
              )}
            </span>
          </div>
          <div className="row-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Returns go to</div>
            {editReturns ? (
              <Field label="Returns address" htmlFor="returns" required>
                <input id="returns" type="text" value={draft.returnsAddress} onChange={(e) => update({ returnsAddress: e.target.value })} />
              </Field>
            ) : (
              <div className="muted" style={{ fontSize: 14 }}>
                {draft.returnsAddress || 'No returns address yet'}
              </div>
            )}
            <span>
              <button type="button" className="link-button small" onClick={() => setEditReturns(!editReturns)}>
                {editReturns ? 'Done' : 'Edit'}
              </button>
            </span>
          </div>
        </div>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="spread" style={{ gap: 8 }}>
          <h2>Shipping options</h2>
          <button
            type="button"
            className="btn btn-small"
            disabled={Boolean(newOption)}
            onClick={() => {
              setEditOption(null);
              setNewOption(emptyOption());
            }}
          >
            Add option
          </button>
        </div>
        {draft.options.length > 0 && (
          <div className="table-wrap" style={{ border: 0 }}>
            <table style={{ minWidth: 560, fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col" style={th}>Zone</th>
                  <th scope="col" style={th}>Option</th>
                  <th scope="col" style={th}>Cost</th>
                  <th scope="col" style={th}>Delivery time</th>
                  <th scope="col" style={th}>Free from</th>
                  <th scope="col" style={th}>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.options.map((o) => (
                  <tr key={o.id}>
                    <td style={td}>{o.zone}</td>
                    <td style={td}>{o.option}</td>
                    <td style={td}>€ {o.cost}</td>
                    <td style={td}>{o.deliveryTime}</td>
                    <td style={td}>{o.freeFrom ? `€ ${o.freeFrom}` : '–'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        type="button"
                        className="link-button small"
                        aria-label={`Edit ${o.zone} ${o.option}`}
                        onClick={() => {
                          setNewOption(null);
                          setEditOption(o.id);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {draft.options.length === 0 && !newOption && <p className="muted small" style={{ margin: 0 }}>No shipping options yet.</p>}
        {editOption && (
          <OptionEditor
            key={editOption}
            value={draft.options.find((o) => o.id === editOption)!}
            onDone={(next) => {
              update({ options: draft.options.map((o) => (o.id === next.id ? next : o)) });
              setEditOption(null);
            }}
            onCancel={() => setEditOption(null)}
            onRemove={() => {
              update({ options: draft.options.filter((o) => o.id !== editOption) });
              setEditOption(null);
            }}
          />
        )}
        {newOption && (
          <OptionEditor
            key={newOption.id}
            value={newOption}
            onDone={(next) => {
              update({ options: [...draft.options, next] });
              setNewOption(null);
            }}
            onCancel={() => setNewOption(null)}
          />
        )}
      </section>

      {alcohol && (
        <section className="card stack" style={{ gap: 12 }}>
          <h2>Alcohol</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Required by law because you sell alcohol. The carrier checks age on delivery.
          </p>
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={draft.ageCheck16} onChange={(e) => update({ ageCheck16: e.target.checked })} style={{ width: 18, height: 18 }} />
            Age-checked delivery for beer and wine (16+)
          </label>
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={draft.ageCheck18} onChange={(e) => update({ ageCheck18: e.target.checked })} style={{ width: 18, height: 18 }} />
            Age-checked delivery for spirits (18+)
          </label>
        </section>
      )}

      <section className="card stack" style={{ gap: 12 }}>
        <div className="spread" style={{ gap: 8 }}>
          <h2>
            Pickup points <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>(optional)</span>
          </h2>
          <button
            type="button"
            className="btn btn-small"
            disabled={Boolean(newPickup)}
            onClick={() => {
              setEditPickup(null);
              setNewPickup(emptyPickup());
            }}
          >
            Add pickup point
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Let customers collect orders, for example at your workshop or a shop that stocks your products.
        </p>
        {draft.pickupPoints.map((p) =>
          editPickup === p.id ? (
            <PickupEditor
              key={p.id}
              value={p}
              onDone={(next) => {
                update({ pickupPoints: draft.pickupPoints.map((x) => (x.id === next.id ? next : x)) });
                setEditPickup(null);
              }}
              onCancel={() => setEditPickup(null)}
              onRemove={() => {
                update({ pickupPoints: draft.pickupPoints.filter((x) => x.id !== p.id) });
                setEditPickup(null);
              }}
            />
          ) : (
            <div key={p.id} className="row-box" style={{ flexWrap: 'wrap', padding: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {[p.address, p.hours].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                className="link-button"
                style={{ fontSize: 14 }}
                aria-label={`Edit ${p.name}`}
                onClick={() => {
                  setNewPickup(null);
                  setEditPickup(p.id);
                }}
              >
                Edit
              </button>
            </div>
          ),
        )}
        {newPickup && (
          <PickupEditor
            key={newPickup.id}
            value={newPickup}
            onDone={(next) => {
              update({ pickupPoints: [...draft.pickupPoints, next] });
              setNewPickup(null);
            }}
            onCancel={() => setNewPickup(null)}
          />
        )}
      </section>

      <section className="card form-grid" style={{ gap: 12 }}>
        <Field label="Processing time (days to dispatch)" htmlFor="processing" required>
          <input
            id="processing"
            type="text"
            inputMode="numeric"
            placeholder="[days]"
            value={draft.processingDays}
            onChange={(e) => update({ processingDays: e.target.value })}
          />
        </Field>
        <Field label="Minimum order value" htmlFor="min-order">
          <input
            id="min-order"
            type="text"
            inputMode="decimal"
            placeholder="€ [amount]"
            value={draft.minimumOrder}
            onChange={(e) => update({ minimumOrder: e.target.value })}
          />
        </Field>
        <Field label="Holiday and closure dates" htmlFor="closures">
          <input id="closures" type="text" placeholder="[from – to]" value={draft.closures} onChange={(e) => update({ closures: e.target.value })} />
        </Field>
      </section>

      <ErrorBox error={action.error} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <SavedNote saved={action.saved} />
        <button className="btn btn-primary" disabled={action.busy}>
          {action.busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
