import Link from 'next/link';
import LogoutButton from '../components/LogoutButton';
import { getExecutiveDashboardData } from '../actions/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getExecutiveDashboardData();

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
              Executive Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Real-time inventory intelligence, ledger movement activity, and operational alerts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              href="/movements/record"
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: '0 1px 2px 0 rgba(37, 99, 235, 0.2)',
              }}
            >
              Record Movement
            </Link>
            <LogoutButton />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ ...navStyle, backgroundColor: '#0f172a', color: 'white', borderColor: '#0f172a' }}>Dashboard</Link>
          <Link href="/items" style={navStyle}>Items Catalog</Link>
          <Link href="/locations" style={navStyle}>Locations & Staff</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div style={{ ...kpiCardStyle, borderLeft: '4px solid #2563eb' }}>
            <span style={{ ...kpiLabelStyle, color: '#2563eb' }}>Active Items</span>
            <div style={kpiValueStyle}>{data.totalActiveItems}</div>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Across {data.categoryBreakdown.length} categories
            </span>
          </div>

          <div style={{ ...kpiCardStyle, borderLeft: '4px solid #dc2626' }}>
            <span style={{ ...kpiLabelStyle, color: '#dc2626' }}>Low-Stock Alerts</span>
            <div style={{ ...kpiValueStyle, color: '#dc2626' }}>{data.lowStockCount}</div>
            <Link href="/alerts" style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', textDecoration: 'none', fontWeight: 600 }}>
              Review Active Alerts &rarr;
            </Link>
          </div>

          <div style={{ ...kpiCardStyle, borderLeft: '4px solid #d97706' }}>
            <span style={{ ...kpiLabelStyle, color: '#d97706' }}>Movements Today</span>
            <div style={kpiValueStyle}>{data.movementsToday}</div>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {data.distinctItemsMovedThisWeek} distinct items moved this week
            </span>
          </div>

          <div style={{ ...kpiCardStyle, borderLeft: '4px solid #059669' }}>
            <span style={{ ...kpiLabelStyle, color: '#059669' }}>Active Locations</span>
            <div style={kpiValueStyle}>{data.activeLocationsCount}</div>
            <Link href="/locations" style={{ fontSize: '12px', color: '#059669', marginTop: '4px', textDecoration: 'none', fontWeight: 600 }}>
              Manage Staff Assignments &rarr;
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Stock by Category</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Inventory distribution across master classifications</p>
              </div>
              <Link href="/items" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                Catalog View &rarr;
              </Link>
            </div>
            <div style={{ overflow: 'hidden', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>Category Name</th>
                    <th style={{ padding: '10px 14px' }}>Distinct Items</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Units On-Hand</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryBreakdown.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{cat.name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{cat.itemCount} items</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        {cat.totalStock.toLocaleString()} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Stock by Physical Location</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>On-hand volume per physical facility</p>
              </div>
              <Link href="/locations" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                Locations Matrix &rarr;
              </Link>
            </div>
            <div style={{ overflow: 'hidden', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>Code / Location</th>
                    <th style={{ padding: '10px 14px' }}>Stocked Items</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Units Held</th>
                  </tr>
                </thead>
                <tbody>
                  {data.locationBreakdown.map((loc) => (
                    <tr key={loc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 7px', borderRadius: '4px', marginRight: '8px', fontSize: '12px' }}>
                          {loc.code}
                        </span>
                        <strong style={{ color: '#1e293b' }}>{loc.name}</strong>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{loc.itemCount} items</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {loc.totalStock.toLocaleString()} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>8-Week Movement Volume Timeline</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Weekly flow of receipts, issues, transfers, and adjustments across all facilities.
              </p>
            </div>
            <Link href="/movements" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              Full Ledger View &rarr;
            </Link>
          </div>

          <div style={{ overflow: 'hidden', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <tr>
                  <th style={{ padding: '10px 14px' }}>Timeframe</th>
                  <th style={{ padding: '10px 14px', color: '#059669' }}>Receipts (+)</th>
                  <th style={{ padding: '10px 14px', color: '#dc2626' }}>Issues (-)</th>
                  <th style={{ padding: '10px 14px', color: '#4338ca' }}>Transfers</th>
                  <th style={{ padding: '10px 14px', color: '#d97706' }}>Adjustments</th>
                </tr>
              </thead>
              <tbody>
                {data.weeklyVolume.map((wv, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{wv.weekLabel}</td>
                    <td style={{ padding: '12px 14px', color: '#059669', fontWeight: 600 }}>+{wv.receipts.toLocaleString()} units</td>
                    <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 600 }}>-{wv.issues.toLocaleString()} units</td>
                    <td style={{ padding: '12px 14px', color: '#4338ca', fontWeight: 600 }}>{wv.transfers.toLocaleString()} units</td>
                    <td style={{ padding: '12px 14px', color: '#d97706', fontWeight: 600 }}>{wv.adjustments.toLocaleString()} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const kpiCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '20px 24px',
  borderRadius: '10px',
  borderTop: '1px solid #e2e8f0',
  borderRight: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 800,
  color: '#0f172a',
  marginTop: '8px',
  letterSpacing: '-0.02em',
};

const sectionCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '24px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
};