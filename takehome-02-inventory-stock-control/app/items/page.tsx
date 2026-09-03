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
            <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>Items & Inventory Catalog</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Search, filter, and track real-time stock across all locations
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {userRole === 'manager' && (
              <Link
                href="/items/new"
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
                + Create New Item
              </Link>
            )}
            <LogoutButton />
          </div>
        </header>

        {/* Navigation Bar */}
        <nav style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={{ ...navStyle, backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>Items</Link>
          <Link href="/locations" style={navStyle}>Locations</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        {/* Filter & Search Form (Goal 6: Server-side filters) */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
          }}
        >
          <form method="GET" action="/items" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            
            {/* Search Input */}
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

            {/* Category Filter */}
            <div>
              <label style={labelStyle}>Category</label>
              <select name="category" defaultValue={categoryId} style={inputStyle}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label style={labelStyle}>Location Filter</label>
              <select name="location" defaultValue={locationId} style={inputStyle}>
                <option value="">All Locations (Global)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                ))}
              </select>
            </div>

            {/* Archive Status Filter */}
            <div>
              <label style={labelStyle}>Archive Status</label>
              <select name="status" defaultValue={status} style={inputStyle}>
                <option value="active">Active Items Only</option>
                <option value="archived">Archived Items Only</option>
                <option value="all">All Items</option>
              </select>
            </div>

            {/* Sort By */}
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

            {/* Low Stock Toggle & Submit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#b45309', fontWeight: 'bold', cursor: 'pointer' }}>
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
                  backgroundColor: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Results Summary Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
            Found <strong style={{ color: '#111827' }}>{totalMatches}</strong> matching items (Page {page} of {totalPages})
          </p>

          {(search || categoryId || locationId || status !== 'active' || lowStockOnly) && (
            <Link
              href="/items"
              style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Clear All Filters ✕
            </Link>
          )}
        </div>

        {/* Items Data Table (Goal 6) */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                    No items match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#111827', fontFamily: 'monospace' }}>
                      {item.sku}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 'bold', color: '#111827' }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: '12px', color: '#6b7280', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#374151' }}>
                      <span style={{ backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                        {item.category_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: item.is_low_stock ? '#dc2626' : '#111827' }}>
                          {locationId ? item.location_on_hand : item.total_on_hand}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.unit_of_measure}</span>
                        {item.is_low_stock && (
                          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            LOW STOCK
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '13px' }}>
                      {item.reorder_level} {item.unit_of_measure}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {item.is_archived ? (
                        <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          Archived
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
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
                          backgroundColor: '#f3f4f6',
                          color: '#1f2937',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Goal 6) */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            {page > 1 && (
              <Link
                href={`/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(categoryId)}&location=${encodeURIComponent(locationId)}&status=${status}&lowStock=${lowStockOnly}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page - 1}`}
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
                href={`/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(categoryId)}&location=${encodeURIComponent(locationId)}&status=${status}&lowStock=${lowStockOnly}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page + 1}`}
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
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#374151',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '13px',
  backgroundColor: 'white',
  boxSizing: 'border-box',
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
