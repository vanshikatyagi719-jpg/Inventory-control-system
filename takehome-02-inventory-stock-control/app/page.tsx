import LogoutButton from '../components/LogoutButton';
import { getDashboardStats } from '../lib/supabase/queries';

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Inventory & Stock Control</h1>
            <p style={{ color: '#666' }}>
              Manage your inventory, locations and stock movements.
            </p>
          </div>

          <LogoutButton />
        </header>

        <nav
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '30px',
          }}
        >
          <a href="/" style={navStyle}>
            Dashboard
          </a>

          <a href="/items" style={navStyle}>
            Items
          </a>

          <a href="/locations" style={navStyle}>
            Locations
          </a>

          <a href="/movements" style={navStyle}>
            Stock Movements
          </a>
        </nav>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          <DashboardCard
            title="Active Items"
            value={String(stats.totalItems)}
            description="Items in active catalog"
          />

          <DashboardCard
            title="Low Stock Alerts"
            value={String(stats.lowStockCount)}
            description="At or below reorder level"
          />

          <DashboardCard
            title="Locations"
            value={String(stats.activeLocations)}
            description="Active distribution sites"
          />

          <DashboardCard
            title="Movements Today"
            value={String(stats.movementsToday)}
            description="Recorded ledger entries"
          />
        </section>
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
};

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
      }}
    >
      <p style={{ margin: 0, color: '#666' }}>{title}</p>

      <h2 style={{ fontSize: '32px', margin: '10px 0' }}>{value}</h2>

      <p style={{ margin: 0, color: '#888' }}>{description}</p>
    </div>
  );
}