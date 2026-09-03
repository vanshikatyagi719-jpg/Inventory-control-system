'use server';

import { createClient } from '../lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  let userRole: 'manager' | 'staff' = 'staff';
  if (currentUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single();
    if (profile?.role === 'manager') userRole = 'manager';
  }

  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('id, name, code, is_active, created_at')
    .order('name');

  if (locError || !locations) {
    console.error('Error fetching locations:', locError?.message);
    return { locations: [], staffUsers: [], userRole, currentUserId };
  }

  const { data: assignments } = await supabase
    .from('location_assignments')
    .select('user_id, location_id');

  const { data: staffProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name');

  const staffMap = new Map(staffProfiles?.map((p) => [p.id, p]));
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

export async function createLocationAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return { error: 'Permission Denied: Only inventory managers can create locations.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const code = (formData.get('code') as string)?.trim().toUpperCase();

  if (!name || !code) {
    return { error: 'Location Name and Unique Code are required.' };
  }

  const { error } = await supabase
    .from('locations')
    .insert({
      name,
      code,
      is_active: true,
    });

  if (error) {
    if (error.code === '23505') {
      return { error: `Location code "${code}" already exists. Please choose a unique code.` };
    }
    return { error: error.message };
  }

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  revalidatePath('/items');
  revalidatePath('/');

  return { success: true };
}

export async function updateLocationStaffAssignmentsAction(locationId: string, staffUserIds: string[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return { error: 'Permission Denied: Only inventory managers can update staff assignments.' };
  }

  const { error: deleteError } = await supabase
    .from('location_assignments')
    .delete()
    .eq('location_id', locationId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (staffUserIds.length > 0) {
    const recordsToInsert = staffUserIds.map((userId) => ({
      location_id: locationId,
      user_id: userId,
    }));

    const { error: insertError } = await supabase
      .from('location_assignments')
      .insert(recordsToInsert);

    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  return { success: true };
}

export async function toggleLocationActiveAction(locationId: string, isActive: boolean) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return { error: 'Permission Denied: Only inventory managers can toggle location status.' };
  }

  const { error } = await supabase
    .from('locations')
    .update({ is_active: isActive })
    .eq('id', locationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/locations');
  revalidatePath('/movements/record');
  revalidatePath('/items');
  return { success: true };
}
