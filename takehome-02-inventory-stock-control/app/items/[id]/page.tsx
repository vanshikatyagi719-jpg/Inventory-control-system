import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getItemById, getUserRole, toggleArchiveItemAction, addItemNoteAction } from '../../../actions/items';
import LogoutButton from '../../../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, userRole] = await Promise.all([
    getItemById(id),
    getUserRole(),
  ]);

  if (!data) {
    notFound();
  }

  const { item, locationStock, movements, auditLogs, notes } = data;

  // Server Action wrappers
  async function handleArchiveToggle() {
    'use server';
    await toggleArchiveItemAction(item.id, !item.is_archived);
  }

  async function handleAddNote(formData: FormData) {
    'use server';
    const note = formData.get('note') as string;
    if (note?.trim()) {
      await addItemNoteAction(item.id, note);
    }
  }

  // Combine Audit Logs & Notes into a single chronological timeline (Goal 9)
  const timelineEvents: {
    id: string;
    type: 'audit' | 'note';
    title: string;
    details?: string;
    author: string;
    timestamp: string;
  }[] = [];

  auditLogs.forEach((log: any) => {
    let title = `Changed ${log.field_name}`;
    let details = `From "${log.old_value || 'None'}" → "${log.new_value || 'None'}"`;

    if (log.field_name === 'item_created') {
      title = 'Item Created in System';
      details = `Created with name "${log.new_value}"`;
    } else if (log.field_name === 'is_archived') {
      title = log.new_value === 'true' ? 'Item Archived' : 'Item Restored to Active';
      details = log.new_value === 'true' ? 'Blocked from day-to-day movements' : 'Reactivated for movements';
    }

    timelineEvents.push({
      id: log.id,
      type: 'audit',
      title,
      details,
      author: log.profiles?.full_name || log.profiles?.email || 'System Trigger',
      timestamp: log.created_at,
    });
  });

  notes.forEach((note: any) => {
    timelineEvents.push({
      id: note.id,
      type: 'note',
      title: 'Staff Note Added',
      details: note.note,
      author: note.profiles?.full_name || note.profiles?.email || 'Staff Member',
      timestamp: note.created_at,
    });
  });

  // Sort timeline newest first
  timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '30px 40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Top Back Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link href="/items" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
            ← Back to Items Catalog
          </Link>
          <LogoutButton />
        </div>

        {/* Item Header Card */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px 30px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px' }}>
                  {item.sku}
                </span>
                <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                  {item.category_name}
                </span>
                {item.is_archived ? (
                  <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                    Archived
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                    Active
                  </span>
                )}
              </div>

              <h1 style={{ margin: '10px 0 6px', fontSize: '26px', color: '#111827' }}>{item.name}</h1>
              {item.description && (
                <p style={{ margin: 0, color: '#4b5563', fontSize: '14px', maxWidth: '650px' }}>
                  {item.description}
                </p>
              )}
            </div>

            {/* Manager Actions Bar */}
            {userRole === 'manager' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href={`/items/${item.id}/edit`}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    color: '#1f2937',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}
                >
                  Edit Item
                </Link>

                <form action={handleArchiveToggle}>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: item.is_archived ? '#059669' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {item.is_archived ? 'Restore Item' : 'Archive Item'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Stock Position Summary Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Total On-Hand</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 'bold', color: item.is_low_stock ? '#dc2626' : '#111827' }}>
                  {item.total_on_hand}
                </span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.unit_of_measure}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Reorder Level</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827' }}>
                  {item.reorder_level}
                </span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.unit_of_measure}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Alert Status</span>
              <div style={{ marginTop: '8px' }}>
                {item.is_low_stock ? (
                  <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    ⚠️ AT / BELOW REORDER LEVEL
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    ✓ Healthy Stock
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stock Breakdown By Location (Goal 3 & 4) */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px 24px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', color: '#111827' }}>Stock On-Hand by Location</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {locationStock.map((loc) => (
              <div
                key={loc.locationId}
                style={{
                  padding: '14px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
                  {loc.locationName} ({loc.locationCode})
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>
                  {loc.onHand} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>{item.unit_of_measure}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Section: Movements Ledger (Goal 3) vs Immutable Timeline (Goal 9) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Section 1: Stock Movement Ledger (Goal 3 & 4: Append-Only) */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Stock Movement Ledger (Append-Only)</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Permanent, tamper-proof record of every receipt, issue, transfer, and adjustment
                </p>
              </div>
              <Link
                href={`/movements/record?item=${item.id}`}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                + Record Movement
              </Link>
            </div>

            {movements.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', margin: 0 }}>
                No movements recorded for this item yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '11px', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '10px 12px' }}>Date</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Quantity</th>
                      <th style={{ padding: '10px 12px' }}>Location / Route</th>
                      <th style={{ padding: '10px 12px' }}>Reason / Notes</th>
                      <th style={{ padding: '10px 12px' }}>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov: any) => {
                      let typeColor = '#059669'; // receipt
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
                          <td style={{ padding: '10px 12px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                            {new Date(mov.created_at).toLocaleDateString()} {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ backgroundColor: typeBg, color: typeColor, padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
                              {mov.movement_type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 'bold', color: typeColor }}>
                            {sign}{mov.quantity} {item.unit_of_measure}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#374151' }}>
                            {mov.movement_type === 'transfer' ? (
                              <span>
                                <strong>{mov.location?.code}</strong> → <strong>{mov.dest_location?.code}</strong>
                              </span>
                            ) : (
                              <span><strong>{mov.location?.name}</strong> ({mov.location?.code})</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#4b5563', fontStyle: mov.reason ? 'normal' : 'italic' }}>
                            {mov.reason || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#4b5563', fontSize: '12px' }}>
                            {mov.profiles?.full_name || mov.profiles?.email || 'Unknown'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Immutable Timeline & Staff Notes (Goal 9) */}
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#111827' }}>
              History You Cannot Rewrite (Audit Timeline & Staff Notes)
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6b7280' }}>
              Every field change, creation event, and staff note is permanently audited and cannot be edited or removed.
            </p>

            {/* Add Note Form */}
            <form action={handleAddNote} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input
                type="text"
                name="note"
                required
                placeholder="Leave an immutable note about this item (e.g., supplier updates, restock ETA)..."
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + Post Note
              </button>
            </form>

            {/* Timeline Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {timelineEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '14px',
                    backgroundColor: evt.type === 'note' ? '#f0fdf4' : '#f9fafb',
                    borderRadius: '6px',
                    borderLeft: evt.type === 'note' ? '4px solid #16a34a' : '4px solid #2563eb',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827' }}>
                        {evt.title}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {evt.details && (
                      <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>
                        {evt.details}
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                      Logged by: <strong>{evt.author}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
