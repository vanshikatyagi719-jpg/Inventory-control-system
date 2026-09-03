import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getItemById, getCategories, updateItemAction, getUserRole } from '../../../../actions/items';

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [data, categories, userRole] = await Promise.all([
    getItemById(id),
    getCategories(),
    getUserRole(),
  ]);

  if (!data) {
    notFound();
  }

  if (userRole !== 'manager') {
    redirect(`/items/${id}`);
  }

  const { item } = data;

  async function handleUpdate(formData: FormData) {
    'use server';
    const result = await updateItemAction(item.id, formData);
    if (result.success) {
      redirect(`/items/${item.id}`);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/items/${item.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
            ← Back to Item Details
          </Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '26px', color: '#111827' }}>Edit Item: {item.name}</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            All field changes are permanently logged to the audit timeline (Goal 9).
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <form action={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* SKU */}
            <div>
              <label style={labelStyle}>
                SKU (Stock Keeping Unit) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="sku"
                required
                defaultValue={item.sku}
                style={inputStyle}
              />
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>
                Item Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={item.name}
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={item.description || ''}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>
                Category <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select name="category_id" defaultValue={item.category_id} required style={inputStyle}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit of Measure & Reorder Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Unit of Measure</label>
                <input
                  type="text"
                  name="unit_of_measure"
                  defaultValue={item.unit_of_measure}
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
                  defaultValue={item.reorder_level}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <Link
                href={`/items/${item.id}`}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold',
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
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Save Changes
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
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#374151',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  backgroundColor: 'white',
  boxSizing: 'border-box',
};
