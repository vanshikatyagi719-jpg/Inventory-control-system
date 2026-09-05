import Link from 'next/link';
import { getItems, getCategories, getLocations, getUserRole } from '../../actions/items';
import LogoutButton from '../../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;

  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const categoryId = typeof resolvedParams.category === 'string' ? resolvedParams.category : '';
  const locationId = typeof resolvedParams.location === 'string' ? resolvedParams.location : '';
  const status = typeof resolvedParams.status === 'string' ? (resolvedParams.status as 'active' | 'archived' | 'all') : 'active';
  const lowStockOnly = resolvedParams.lowStock === 'true';
  const sortBy = typeof resolvedParams.sortBy === 'string' ? (resolvedParams.sortBy as 'name' | 'on_hand' | 'reorder_level' | 'sku') : 'name';
  const sortDir = typeof resolvedParams.sortDir === 'string' ? (resolvedParams.sortDir as 'asc' | 'desc') : 'asc';
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) || 1 : 1;

  const [itemsData, categories, locations, userRole] = await Promise.all([
    getItems({
      search,
      categoryId,
      locationId,
      status,
      lowStockOnly,
      sortBy,
      sortDir,
      page,
      pageSize: 10,
    }),
    getCategories(),
    getLocations(),
    getUserRole(),
  ]);

  const { items, totalMatches, totalPages } = itemsData;

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
              Items & Inventory Catalog
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Search, filter, and track real-time stock across all locations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {userRole === 'manager' && (
              <Link
                href="/items/new"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                + Create New Item
              </Link>
            )}
            <LogoutButton />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={{ ...navStyle, backgroundColor: '#0f172a', color: 'white', borderColor: '#0f172a' }}>Items Catalog</Link>
          <Link href="/locations" style={navStyle}>Locations & Staff</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <form method="GET" action="/items" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            
            <div>
              <label style={labelStyle}>Search Name or SKU</label>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="e.g. Hex Bolts, TOOL-DRL"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Category</label>
              <select name="category" defaultValue={categoryId} style={inputStyle}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Location Filter</label>
              <select name="location" defaultValue={locationId} style={inputStyle}>
                <option value="">All Locations (Global)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Archive Status</label>
              <select name="status" defaultValue={status} style={inputStyle}>
                <option value="active">Active Items Only</option>
                <option value="archived">Archived Items Only</option>
                <option value="all">All Items</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Sort By</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select name="sortBy" defaultValue={sortBy} style={{ ...inputStyle, flex: 2 }}>
                  <option value="name">Name</option>
                  <option value="sku">SKU</option>
                  <option value="on_hand">On-Hand Quantity</option>
                  <option value="reorder_level">Reorder Level</option>
                </select>
                <select name="sortDir" defaultValue={sortDir} style={{ ...inputStyle, flex: 1 }}>
                  <option value="asc">ASC</option>
                  <option value="desc">DESC</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#b45309', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="lowStock"
                  value="true"
                  defaultChecked={lowStockOnly}
                />
                At or Below Reorder
              </label>

              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            Found <strong style={{ color: '#0f172a' }}>{totalMatches}</strong> matching items (Page {page} of {totalPages})
          </p>

          {(search || categoryId || locationId || status !== 'active' || lowStockOnly) && (
            <Link
              href="/items"
              style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
            >
              Clear All Filters
            </Link>
          )}
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>SKU</th>
                <th style={{ padding: '12px 16px' }}>Name & Description</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>On-Hand Stock</th>
                <th style={{ padding: '12px 16px' }}>Reorder Level</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No items match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                      <Link href={`/items/${item.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                        {item.sku}
                      </Link>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/items/${item.id}`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                        {item.name}
                      </Link>
                      {item.description && (
                        <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {item.description}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                        {item.category_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: item.is_low_stock ? '#dc2626' : '#0f172a' }}>
                          {locationId ? item.location_on_hand : item.total_on_hand}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{item.unit_of_measure}</span>
                        {item.is_low_stock && (
                          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            LOW STOCK
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>
                      {item.reorder_level} {item.unit_of_measure}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {item.is_archived ? (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          Archived
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          Active
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/items/${item.id}`}
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        View Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            {page > 1 && (
              <Link
                href={`/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(categoryId)}&location=${encodeURIComponent(locationId)}&status=${status}&lowStock=${lowStockOnly}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page - 1}`}
                style={paginationBtnStyle}
              >
                &larr; Previous
              </Link>
            )}

            <span style={{ padding: '8px 16px', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center' }}>
              Page {page} of {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={`/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(categoryId)}&location=${encodeURIComponent(locationId)}&status=${status}&lowStock=${lowStockOnly}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page + 1}`}
                style={paginationBtnStyle}
              >
                Next &rarr;
              </Link>
            )}
          </div>
        )}

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  backgroundColor: 'white',
  boxSizing: 'border-box',
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'white',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  color: '#0f172a',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: 600,
};
