import Link from 'next/link';
import { getGlobalMovements } from '../../actions/movements';
import { getLocations } from '../../actions/items';
import LogoutButton from '../../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;

  const locationId = typeof resolvedParams.location === 'string' ? resolvedParams.location : '';
  const movementType = typeof resolvedParams.type === 'string' ? resolvedParams.type : '';
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) || 1 : 1;

  const [{ movements, totalMatches, totalPages }, locations] = await Promise.all([
    getGlobalMovements({
      locationId,
      movementType,
      page,
      pageSize: 15,
    }),
    getLocations(),
  ]);

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '30px 40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>Stock Movement Ledger</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Append-only audit ledger of every unit received, issued, transferred, or adjusted (Goal 3 & 4)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              href="/movements/record"
              style={{
                padding: '10px 18px',
                backgroundColor: '#2563eb',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              + Record Movement
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* Navigation Bar */}
        <nav style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={navStyle}>Items</Link>
          <Link href="/locations" style={navStyle}>Locations</Link>
          <Link href="/movements" style={{ ...navStyle, backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        {/* Filter Bar */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '20px',
          }}
        >
          <form method="GET" action="/movements" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            
            <div>
              <label style={labelStyle}>Filter by Movement Type</label>
              <select name="type" defaultValue={movementType} style={inputStyle}>
                <option value="">All Types</option>
                <option value="receipt">Receipts (+)</option>
                <option value="issue">Issues (-)</option>
                <option value="transfer">Transfers (⇄)</option>
                <option value="adjustment">Adjustments (±)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Filter by Location</label>
              <select name="location" defaultValue={locationId} style={inputStyle}>
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              style={{
                padding: '9px 18px',
                backgroundColor: '#1f2937',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Filter Ledger
            </button>

            {(locationId || movementType) && (
              <Link
                href="/movements"
                style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold', alignSelf: 'center' }}
              >
                Clear Filters ✕
              </Link>
            )}
          </form>
        </div>

        {/* Ledger Table (Goal 4: Immutable) */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Kind</th>
                <th style={{ padding: '12px 16px' }}>Item (SKU / Name)</th>
                <th style={{ padding: '12px 16px' }}>Quantity</th>
                <th style={{ padding: '12px 16px' }}>Location / Route</th>
                <th style={{ padding: '12px 16px' }}>Reason / Details</th>
                <th style={{ padding: '12px 16px' }}>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                    No stock movements found matching criteria.
                  </td>
                </tr>
              ) : (
                movements.map((mov: any) => {
                  let typeColor = '#059669';
                  let typeBg = '#ecfdf5';
                  let sign = '+';

                  if (mov.movement_type === 'issue') {
                    typeColor = '#dc2626';
                    typeBg = '#fee2e2';
                    sign = '-';
                  } else if (mov.movement_type === 'transfer') {
                    typeColor = '#4338ca';
                    typeBg = '#e0e7ff';
                    sign = '⇄ ';
                  } else if (mov.movement_type === 'adjustment') {
                    typeColor = '#b45309';
                    typeBg = '#fef3c7';
                    sign = mov.adjustment_direction === 'decrease' ? '-' : '+';
                  }

                  return (
                    <tr key={mov.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        {new Date(mov.created_at).toLocaleDateString()} {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ backgroundColor: typeBg, color: typeColor, padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
                          {mov.movement_type}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/items/${mov.item_id}`} style={{ fontWeight: 'bold', color: '#2563eb', textDecoration: 'none' }}>
                          [{mov.items?.sku}]
                        </Link>{' '}
                        <span style={{ color: '#111827' }}>{mov.items?.name}</span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: typeColor, fontSize: '14px' }}>
                        {sign}{mov.quantity} <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>{mov.items?.unit_of_measure}</span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#374151' }}>
                        {mov.movement_type === 'transfer' ? (
                          <span>
                            <strong>{mov.location?.code}</strong> → <strong>{mov.dest_location?.code}</strong>
                          </span>
                        ) : (
                          <span><strong>{mov.location?.name}</strong> ({mov.location?.code})</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#4b5563', fontStyle: mov.reason ? 'normal' : 'italic' }}>
                        {mov.reason || '—'}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#4b5563', fontSize: '12px' }}>
                        {mov.profiles?.full_name || mov.profiles?.email || 'Unknown'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            {page > 1 && (
              <Link
                href={`/movements?type=${movementType}&location=${locationId}&page=${page - 1}`}
                style={paginationBtnStyle}
              >
                ← Previous
              </Link>
            )}

            <span style={{ padding: '8px 16px', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
              Page {page} of {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={`/movements?type=${movementType}&location=${locationId}&page=${page + 1}`}
                style={paginationBtnStyle}
              >
                Next →
              </Link>
            )}
          </div>
        )}

      </div>
    </main>
  );
}

const navStyle = {
  textDecoration: 'none',
  padding: '10px 16px',
  backgroundColor: 'white',
  border: '1px solid #ddd',
  borderRadius: '6px',
  color: '#333',
  fontSize: '14px',
  fontWeight: '500',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#374151',
  marginBottom: '4px',
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '13px',
  backgroundColor: 'white',
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  color: '#1f2937',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: 'bold',
};
