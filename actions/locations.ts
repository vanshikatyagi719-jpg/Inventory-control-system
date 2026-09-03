'use server';

import { createClient } from '../lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface LocationWithStaff {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  assignedStaff: {
    userId: string;
    fullName: string;
    email: string;
  }[];
  isAssignedToCurrentUser: boolean;
}

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
}

export async function getLocationsWithStaff() {
  const supabase = await createClient();

  const [{ data: authData }, { data: locations, error: locError }, { data: assignments }, { data: staffProfiles }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('locations').select('id, name, code, is_active, created_at').order('name'),
    supabase.from('location_assignments').select('user_id, location_id'),
    supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
  ]);

  const currentUserId = authData?.user?.id;
  const staffMap = new Map(staffProfiles?.map((p) => [p.id, p]));

  let userRole: 'manager' | 'staff' = 'staff';
  if (currentUserId) {
    const p = staffMap.get(currentUserId);
    if (p?.role === 'manager') userRole = 'manager';
  }

  if (locError || !locations) {
    console.error('Error fetching locations:', locError?.message);
    return { locations: [], staffUsers: [], userRole, currentUserId };
  }

  const staffUsers: StaffUser[] = (staffProfiles || [])
    .filter((p) => p.role === 'staff')
    .map((p) => ({ id: p.id, full_name: p.full_name, email: p.email }));

  const enrichedLocations: LocationWithStaff[] = locations.map((loc) => {
    const assignedUserIds = assignments
      ?.filter((a) => a.location_id === loc.id)
      .map((a) => a.user_id) || [];

    const assignedStaff = assignedUserIds
      .map((uid) => {
        const p = staffMap.get(uid);
        return p ? { userId: p.id, fullName: p.full_name, email: p.email } : null;
      })
      .filter(Boolean) as { userId: string; fullName: string; email: string }[];

    const isAssignedToCurrentUser = userRole === 'manager' || assignedUserIds.includes(currentUserId || '');

    return {
      ...loc,
      assignedStaff,
      isAssignedToCurrentUser,
    };
  });

  return {
    locations: enrichedLocations,
    staffUsers,
    userRole,
    currentUserId,
  };
}

export async function createLocationAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return;
  }

  const name = (formData.get('name') as string)?.trim();
  const code = (formData.get('code') as string)?.trim().toUpperCase();

  if (!name || !code) {
    return;
  }

  await supabase
    .from('locations')
    .insert({
      name,
      code,
      is_active: true,
    });

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  revalidatePath('/items');
  revalidatePath('/');
  redirect('/locations');
}

export async function createStaffMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return;
  }

  const fullName = (formData.get('full_name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string)?.trim();

  if (!fullName || !email || !password || password.length < 6) {
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'staff',
      },
    },
  });

  if (authError || !authData.user) {
    return;
  }

  await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'staff',
    });

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  redirect('/locations');
}

export async function updateLocationStaffAssignmentsAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return;
  }

  const locationId = formData.get('location_id') as string;
  const staffUserIds = formData.getAll('staff_ids') as string[];

  await supabase
    .from('location_assignments')
    .delete()
    .eq('location_id', locationId);

  if (staffUserIds.length > 0) {
    const recordsToInsert = staffUserIds.map((userId) => ({
      location_id: locationId,
      user_id: userId,
    }));

    await supabase
      .from('location_assignments')
      .insert(recordsToInsert);
  }

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  redirect('/locations');
}

export async function toggleLocationActiveAction(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return;
  }

  const locationId = formData.get('location_id') as string;
  const newStatus = formData.get('is_active') === 'true';

  await supabase
    .from('locations')
    .update({ is_active: newStatus })
    .eq('id', locationId);

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  revalidatePath('/items');
  revalidatePath('/');
  redirect('/locations');
}
