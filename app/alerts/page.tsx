import Link from 'next/link';
import LogoutButton from '../../components/LogoutButton';
import { getAlertsData, dismissAlertAction } from '../../actions/alerts';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const { activeAlerts, dismissedList } = await getAlertsData();

  async function handleDismiss(formData: FormData) {
    'use server';
    await dismissAlertAction(formData);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '36px 48px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Low-Stock Alerts & Dismissal Machine
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Cycle-aware alerts that resurrect automatically whenever stock drops below reorder level.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LogoutButton />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={navStyle}>Items Catalog</Link>
          <Link href="/locations" style={navStyle}>Locations & Staff</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={{ ...navStyle, backgroundColor: '#0f172a', color: 'white', borderColor: '#0f172a' }}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>
                  Active Alerts Requiring Action ({activeAlerts.length})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Items currently at or below their reorder threshold with no active dismissal in this replenishment cycle.
                </p>
              </div>
            </div>

            {activeAlerts.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f0fdf4', borderRadius: '6px', color: '#166534', fontWeight: 600, fontSize: '14px' }}>
                All inventory items are currently above their reorder thresholds or acknowledged.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#991b1b', fontSize: '11px', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>SKU</th>
                      <th style={{ padding: '10px 14px' }}>Item Name</th>
                      <th style={{ padding: '10px 14px' }}>Category</th>
                      <th style={{ padding: '10px 14px' }}>On-Hand Stock</th>
                      <th style={{ padding: '10px 14px' }}>Reorder Level</th>
                      <th style={{ padding: '10px 14px' }}>Deficit</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAlerts.map((alert) => (
                      <tr key={alert.itemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                          <Link href={`/items/${alert.itemId}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                            {alert.sku}
                          </Link>
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                          {alert.name}
                        </td>

                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {alert.categoryName}
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>
                          {alert.totalOnHand} {alert.unitOfMeasure}
                        </td>

                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {alert.reorderLevel} {alert.unitOfMeasure}
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#b91c1c' }}>
                          -{alert.deficit} {alert.unitOfMeasure}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Link
                              href={`/movements/record?item=${alert.itemId}`}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#059669',
                                color: 'white',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              + Restock
                            </Link>

                            <form action={handleDismiss} style={{ display: 'flex', gap: '4px' }}>
                              <input type="hidden" name="item_id" value={alert.itemId} />
                              <input type="hidden" name="current_stock" value={alert.totalOnHand} />
                              <input
                                type="text"
                                name="reason"
                                placeholder="Dismissal reason (optional)"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  width: '160px',
                                }}
                              />
                              <button
                                type="submit"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#475569',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Dismiss
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Dismissed Alerts History
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
              Log of acknowledged alerts. If stock is replenished above reorder level, the cycle resets automatically.
            </p>

            {dismissedList.length === 0 ? (
              <p style={{ margin: 0, padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No alerts have been dismissed yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Dismissed Date</th>
                      <th style={{ padding: '10px 14px' }}>Item (SKU / Name)</th>
                      <th style={{ padding: '10px 14px' }}>Stock Level When Dismissed</th>
                      <th style={{ padding: '10px 14px' }}>Reason / Operational Note</th>
                      <th style={{ padding: '10px 14px' }}>Dismissed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dismissedList.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(d.dismissedAt).toLocaleDateString()} {new Date(d.dismissedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Link href={`/items/${d.itemId}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                            [{d.sku}]
                          </Link>{' '}
                          <span style={{ color: '#0f172a' }}>{d.name}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>
                          {d.stockLevelAtDismissal}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                          {d.reason || 'None provided'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {d.dismissedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}

const navStyle: React.CSSProperties = {
  textDecoration: 'none',
  padding: '8px 16px',
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  color: '#475569',
  fontSize: '13px',
  fontWeight: 600,
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
};