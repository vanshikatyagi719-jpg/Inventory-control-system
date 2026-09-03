import Link from 'next/link';
import { getLocationsWithStaff, createLocationAction, updateLocationStaffAssignmentsAction, toggleLocationActiveAction } from '../../actions/locations';
import LogoutButton from '../../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const { locations, staffUsers, userRole } = await getLocationsWithStaff();

  const isManager = userRole === 'manager';

  // Server Action wrappers
  async function handleCreateLocation(formData: FormData) {
    'use server';
    await createLocationAction(formData);
  }

  async function handleUpdateStaff(formData: FormData) {
    'use server';
    const locationId = formData.get('location_id') as string;
    const selectedStaffIds = formData.getAll('staff_ids') as string[];
    await updateLocationStaffAssignmentsAction(locationId, selectedStaffIds);
  }

  async function handleToggleStatus(locationId: string, currentStatus: boolean) {
    'use server';
    await toggleLocationActiveAction(locationId, !currentStatus);
  }

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
            <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>Physical Locations & Staff Assignments</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Staff members are restricted to recording movements at their assigned locations (Goal 5).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LogoutButton />
          </div>
        </header>

        {/* Navigation Bar */}
        <nav style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={navStyle}>Items</Link>
          <Link href="/locations" style={{ ...navStyle, backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>Locations</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        {/* Manager Tool: Create New Location (Goal 5) */}
        {isManager && (
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
            <h2 style={{ margin: '0 0 12px', fontSize: '16px', color: '#111827' }}>+ Create New Location</h2>
            <form action={handleCreateLocation} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '220px' }}>
                <label style={labelStyle}>Location Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. East Distribution Hub, Retail Floor C"
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Unique Code</label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="e.g. WH-EAST, RET-03"
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Add Location
              </button>
            </form>
          </div>
        )}

        {/* Locations List / Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {locations.map((loc) => {
            const assignedIds = loc.assignedStaff.map((s) => s.userId);

            return (
              <div
                key={loc.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  
                  {/* Location Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px' }}>
                        {loc.code}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{loc.name}</h3>
                      {loc.is_active ? (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          Active
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          Inactive
                        </span>
                      )}
                      {!isManager && loc.isAssignedToCurrentUser && (
                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          ✓ Assigned to You
                        </span>
                      )}
                    </div>

                    {/* Assigned Staff Chips */}
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
                        Assigned Staff ({loc.assignedStaff.length}):
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {loc.assignedStaff.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                            No staff assigned (Only managers can record movements here)
                          </span>
                        ) : (
                          loc.assignedStaff.map((staff) => (
                            <span
                              key={staff.userId}
                              style={{
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#166534',
                                padding: '3px 10px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}
                            >
                              👤 {staff.fullName} ({staff.email})
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manager Controls: Deactivate Toggle */}
                  {isManager && (
                    <form action={handleToggleStatus.bind(null, loc.id, loc.is_active)}>
                      <button
                        type="submit"
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: loc.is_active ? '#dc2626' : '#059669',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        {loc.is_active ? 'Deactivate Location' : 'Activate Location'}
                      </button>
                    </form>
                  )}

                </div>

                {/* Manager Tool: Update Staff Assignments Matrix (Goal 5) */}
                {isManager && staffUsers.length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                    <form action={handleUpdateStaff} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <input type="hidden" name="location_id" value={loc.id} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>
                          Assign Staff:
                        </span>
                        {staffUsers.map((staff) => (
                          <label key={staff.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              name="staff_ids"
                              value={staff.id}
                              defaultChecked={assignedIds.includes(staff.id)}
                            />
                            {staff.full_name}
                          </label>
                        ))}
                      </div>

                      <button
                        type="submit"
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#1f2937',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Save Staff Assignments
                      </button>
                    </form>
                  </div>
                )}

              </div>
            );
          })}
        </div>

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
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '13px',
  backgroundColor: 'white',
  boxSizing: 'border-box',
};
