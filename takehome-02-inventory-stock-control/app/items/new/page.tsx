import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCategories, createItemAction, getUserRole } from '../../../actions/items';

export default async function NewItemPage() {
  const [categories, userRole] = await Promise.all([
    getCategories(),
    getUserRole(),
  ]);

  if (userRole !== 'manager') {
    redirect('/items');
  }

  async function handleCreate(formData: FormData) {
    'use server';
    const result = await createItemAction(formData);
    if (result.id) {
      redirect(`/items/${result.id}`);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '40px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <Link href="/items" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            &larr; Back to Items Catalog
          </Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Create New Inventory Item</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Managers can add new items to the central catalog.
          </p>
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
          <form action={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <label style={labelStyle}>
                SKU (Stock Keeping Unit) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="sku"
                required
                placeholder="e.g. FAST-HEX-M12, ELEC-CAB-10M"
                style={inputStyle}
              />
              <span style={hintStyle}>Must be a unique alphanumeric identifier.</span>
            </div>

            <div>
              <label style={labelStyle}>
                Item Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. M12 Stainless Steel Hex Bolts"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Specifications, dimensions, or manufacturer details..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Category <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select name="category_id" required style={inputStyle}>
                <option value="">-- Select a maintained category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Unit of Measure</label>
                <input
                  type="text"
                  name="unit_of_measure"
                  defaultValue="units"
                  placeholder="e.g. units, boxes, pairs, meters"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Reorder Level Threshold</label>
                <input
                  type="number"
                  name="reorder_level"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <Link
                href="/items"
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
                style={{
                  padding: '10px 22px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save Item to Catalog
              </button>
            </div>

          </form>
        </div>

      </div>
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
