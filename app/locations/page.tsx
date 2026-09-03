import Link from 'next/link';
import { getLocationsWithStaff, createLocationAction, createStaffMemberAction, updateLocationStaffAssignmentsAction, toggleLocationActiveAction } from '../../actions/locations';
import LogoutButton from '../../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const { locations, staffUsers, userRole } = await getLocationsWithStaff();

  const isManager = userRole === 'manager';

  async function handleCreateLocation(formData: FormData) {
    'use server';
    await createLocationAction(formData);
  }

  async function handleCreateStaff(formData: FormData) {
    'use server';
    await createStaffMemberAction(formData);
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
        backgroundColor: '#f8fafc',
        padding: '36px 48px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
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
              Physical Locations & Staff Assignments
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Staff members are restricted to recording movements at their assigned locations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LogoutButton />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={navStyle}>Items Catalog</Link>
          <Link href="/locations" style={{ ...navStyle, backgroundColor: '#0f172a', color: 'white', borderColor: '#0f172a' }}>Locations & Staff</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={navStyle}>Bulk CSV</Link>
        </nav>

        {isManager && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>+ Create New Location</h2>
              <form action={handleCreateLocation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Location Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. East Distribution Hub, Retail Floor C"
                    style={inputStyle}
                  />
                </div>

                <div>
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
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Add Location
                </button>
              </form>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>+ Register New Staff Account</h2>
              <form action={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Staff Member Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    placeholder="e.g. Marcus Vance"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Work Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="staff.marcus@demo.com"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Temporary Password</label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="Password123!"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Create Staff Account
                </button>
              </form>
            </div>

          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {locations.map((loc) => {
            const assignedIds = loc.assignedStaff.map((s) => s.userId);

            return (
              <div
                key={loc.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                        {loc.code}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{loc.name}</h3>
                      {loc.is_active ? (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          Active
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          Inactive
                        </span>
                      )}
                      {!isManager && loc.isAssignedToCurrentUser && (
                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          Assigned to You
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                        Assigned Staff ({loc.assignedStaff.length}):
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {loc.assignedStaff.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
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
                                fontWeight: 500,
                              }}
                            >
                              {staff.fullName} ({staff.email})
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {isManager && (
                    <form action={handleToggleStatus.bind(null, loc.id, loc.is_active)}>
                      <button
                        type="submit"
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: loc.is_active ? '#dc2626' : '#059669',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {loc.is_active ? 'Deactivate Location' : 'Activate Location'}
                      </button>
                    </form>
                  )}

                </div>

                {isManager && staffUsers.length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <form action={handleUpdateStaff} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <input type="hidden" name="location_id" value={loc.id} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          Assign Staff:
                        </span>
                        {staffUsers.map((staff) => (
                          <label key={staff.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
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
                          backgroundColor: '#0f172a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
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
  marginBottom: '4px',
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
