'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { recordMovementAction, getAccessibleLocations } from '../../../actions/movements';
import { getItems, getLocations } from '../../../actions/items';

function RecordMovementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams.get('item') || '';

  const [movementType, setMovementType] = useState<'receipt' | 'issue' | 'transfer' | 'adjustment'>('receipt');
  const [items, setItems] = useState<any[]>([]);
  const [accessibleLocations, setAccessibleLocations] = useState<any[]>([]);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId);
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'increase' | 'decrease'>('decrease');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      const [itemsRes, locRes, allLocRes] = await Promise.all([
        getItems({ status: 'active', pageSize: 100 }),
        getAccessibleLocations(),
        getLocations(),
      ]);

      setItems(itemsRes.items);
      setAccessibleLocations(locRes.locations);
      setAllLocations(allLocRes);
      setIsManager(locRes.isManager);

      if (locRes.locations.length > 0) {
        setSourceLocationId(locRes.locations[0].id);
      }
      if (allLocRes.length > 1) {
        setDestLocationId(allLocRes[1].id);
      }
    }
    loadData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('item_id', selectedItemId);
    formData.append('movement_type', movementType);
    formData.append('quantity', quantity);
    formData.append('location_id', sourceLocationId);

    if (movementType === 'transfer') {
      formData.append('destination_location_id', destLocationId);
    }
    if (movementType === 'adjustment') {
      formData.append('adjustment_direction', adjustmentDirection);
      formData.append('reason', reason);
    }

    startTransition(async () => {
      const result = await recordMovementAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/items/${selectedItemId}`);
      }
    });
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/movements" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          &larr; Back to Movement Ledger
        </Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Record Stock Movement</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
          Every entry is permanently written to the append-only stock ledger.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => { setMovementType('receipt'); setError(null); }}
          style={{
            padding: '12px',
            border: movementType === 'receipt' ? '2px solid #059669' : '1px solid #cbd5e1',
            backgroundColor: movementType === 'receipt' ? '#ecfdf5' : 'white',
            color: movementType === 'receipt' ? '#065f46' : '#334155',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Receipt Inflow (+)
        </button>

        <button
          type="button"
          onClick={() => { setMovementType('issue'); setError(null); }}
          style={{
            padding: '12px',
            border: movementType === 'issue' ? '2px solid #dc2626' : '1px solid #cbd5e1',
            backgroundColor: movementType === 'issue' ? '#fef2f2' : 'white',
            color: movementType === 'issue' ? '#991b1b' : '#334155',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Issue Outflow (-)
        </button>

        <button
          type="button"
          onClick={() => { setMovementType('transfer'); setError(null); }}
          style={{
            padding: '12px',
            border: movementType === 'transfer' ? '2px solid #4338ca' : '1px solid #cbd5e1',
            backgroundColor: movementType === 'transfer' ? '#e0e7ff' : 'white',
            color: movementType === 'transfer' ? '#3730a3' : '#334155',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Transfer (Loc to Loc)
        </button>

        <button
          type="button"
          disabled={!isManager}
          onClick={() => { if (isManager) { setMovementType('adjustment'); setError(null); } }}
          title={!isManager ? 'Managers only' : ''}
          style={{
            padding: '12px',
            border: movementType === 'adjustment' ? '2px solid #d97706' : '1px solid #cbd5e1',
            backgroundColor: movementType === 'adjustment' ? '#fef3c7' : 'white',
            color: movementType === 'adjustment' ? '#92400e' : '#334155',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: isManager ? 'pointer' : 'not-allowed',
            opacity: isManager ? 1 : 0.5,
          }}
        >
          Adjustment {!isManager && '(Mgr Only)'}
        </button>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>
              Select Item <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">-- Choose an item from catalog --</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.sku}] {it.name} (Global On-Hand: {it.total_on_hand} {it.unit_of_measure})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              {movementType === 'transfer' ? 'Source Location (Moving From)' : 'Location'} <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              required
              style={inputStyle}
            >
              {accessibleLocations.length === 0 ? (
                <option value="">No locations assigned to your account</option>
              ) : (
                accessibleLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))
              )}
            </select>
            {!isManager && (
              <span style={hintStyle}>Showing only locations assigned to your staff profile.</span>
            )}
          </div>

          {movementType === 'transfer' && (
            <div>
              <label style={labelStyle}>
                Destination Location (Moving To) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={destLocationId}
                onChange={(e) => setDestLocationId(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">-- Select destination --</option>
                {allLocations
                  .filter((l) => l.id !== sourceLocationId)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
              </select>
              <span style={hintStyle}>Transfers move stock as a single indivisible atomic transaction.</span>
            </div>
          )}

          {movementType === 'adjustment' && (
            <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Adjustment Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="adj_dir"
                      value="decrease"
                      checked={adjustmentDirection === 'decrease'}
                      onChange={() => setAdjustmentDirection('decrease')}
                    />
                    Decrease Stock (Damage, Shrinkage, Miscount)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#065f46', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="adj_dir"
                      value="increase"
                      checked={adjustmentDirection === 'increase'}
                      onChange={() => setAdjustmentDirection('increase')}
                    />
                    Increase Stock (Found Stock, Count Correction)
                  </label>
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Reason for Adjustment <span style={{ color: '#dc2626' }}>* (Mandatory)</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Water leak in warehouse, physical recount variance"
                  style={inputStyle}
                />
                <span style={hintStyle}>The server strictly rejects any adjustment without an explicit reason.</span>
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>
              Quantity to Move ({selectedItem?.unit_of_measure || 'units'}) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
              style={inputStyle}
            />
            <span style={hintStyle}>
              The database enforces row locking; requests driving location quantity negative are aborted.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <Link
              href="/movements"
              style={{
                padding: '10px 18px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isPending || !selectedItemId}
              style={{
                padding: '10px 24px',
                backgroundColor: movementType === 'receipt' ? '#059669' : movementType === 'issue' ? '#dc2626' : movementType === 'transfer' ? '#4338ca' : '#d97706',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isPending || !selectedItemId ? 'not-allowed' : 'pointer',
                opacity: isPending || !selectedItemId ? 0.5 : 1,
              }}
            >
              {isPending ? 'Writing to Ledger...' : `Confirm & Record ${movementType.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RecordMovementPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '40px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading movement form...</div>}>
        <RecordMovementForm />
      </Suspense>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  backgroundColor: 'white',
  boxSizing: 'border-box',
};

const hintStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#64748b',
  marginTop: '4px',
};
