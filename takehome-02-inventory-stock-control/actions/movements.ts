'use server';

import { createClient } from '../lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface MovementFilterParams {
  itemId?: string;
  locationId?: string;
  movementType?: string;
  page?: number;
  pageSize?: number;
}

export async function recordMovementAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be signed in to record stock movements.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'staff';

  const itemId = formData.get('item_id') as string;
  const movementType = formData.get('movement_type') as 'receipt' | 'issue' | 'transfer' | 'adjustment';
  const quantity = Number(formData.get('quantity'));
  const locationId = formData.get('location_id') as string;
  const destinationLocationId = (formData.get('destination_location_id') as string) || null;
  const adjustmentDirection = (formData.get('adjustment_direction') as 'increase' | 'decrease') || null;
  const reason = (formData.get('reason') as string)?.trim() || null;

  if (!itemId) return { error: 'Please select an item.' };
  if (!locationId) return { error: 'Please select a location.' };
  if (!quantity || quantity <= 0 || isNaN(quantity)) {
    return { error: 'Quantity must be a positive number greater than zero.' };
  }

  if (movementType === 'adjustment' && userRole !== 'manager') {
    return { error: 'Only inventory managers can record stock adjustments.' };
  }

  if (userRole === 'staff') {
    const { data: assignment } = await supabase
      .from('location_assignments')
      .select('location_id')
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .single();

    if (!assignment) {
      return { error: 'Permission Denied: You are not assigned to record movements at this location.' };
    }
  }

  if (movementType === 'transfer') {
    if (!destinationLocationId) {
      return { error: 'Destination location is required for transfers.' };
    }
    if (locationId === destinationLocationId) {
      return { error: 'Source and destination locations cannot be the same.' };
    }
  }

  if (movementType === 'adjustment') {
    if (!adjustmentDirection) {
      return { error: 'Please select whether the adjustment is an increase or decrease.' };
    }
    if (!reason || reason.length < 3) {
      return { error: 'An explicit reason is required for stock adjustments.' };
    }
  }

  const { data: newMovementId, error: rpcError } = await supabase.rpc('record_stock_movement', {
    p_item_id: itemId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_location_id: locationId,
    p_destination_location_id: movementType === 'transfer' ? destinationLocationId : null,
    p_adjustment_direction: movementType === 'adjustment' ? adjustmentDirection : null,
    p_reason: reason,
    p_user_id: user.id,
  });

  if (rpcError) {
    console.error('record_stock_movement RPC error:', rpcError.message);
    return { error: rpcError.message };
  }

  revalidatePath('/movements');
  revalidatePath(`/items/${itemId}`);
  revalidatePath('/items');
  revalidatePath('/');

  return { success: true, movementId: newMovementId, itemId };
}

export async function getGlobalMovements(params: MovementFilterParams = {}) {
  const supabase = await createClient();
  const { itemId, locationId, movementType, page = 1, pageSize = 20 } = params;

  let query = supabase
    .from('stock_movements')
    .select(`
      id,
      item_id,
      movement_type,
      adjustment_direction,
      quantity,
      location_id,
      destination_location_id,
      reason,
      created_at,
      recorded_by
    `, { count: 'exact' });

  if (itemId) query = query.eq('item_id', itemId);
  if (movementType) query = query.eq('movement_type', movementType);
  if (locationId) {
    query = query.or(`location_id.eq.${locationId},destination_location_id.eq.${locationId}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: rawMovements, count, error } = await query;

  if (error || !rawMovements) {
    console.error('Error fetching global movements:', error?.message);
    return { movements: [], totalMatches: 0, totalPages: 1 };
  }

  const itemIds = Array.from(new Set(rawMovements.map((m) => m.item_id)));
  const locIds = Array.from(
    new Set(
      rawMovements
        .flatMap((m) => [m.location_id, m.destination_location_id])
        .filter(Boolean)
    )
  );
  const userIds = Array.from(new Set(rawMovements.map((m) => m.recorded_by)));

  const [{ data: items }, { data: locations }, { data: profiles }] = await Promise.all([
    supabase.from('items').select('id, sku, name, unit_of_measure').in('id', itemIds),
    supabase.from('locations').select('id, name, code').in('id', locIds),
    supabase.from('profiles').select('id, full_name, email').in('id', userIds),
  ]);

  const itemMap = new Map(items?.map((i) => [i.id, i]));
  const locMap = new Map(locations?.map((l) => [l.id, l]));
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  const enrichedMovements = rawMovements.map((mov) => ({
    ...mov,
    items: itemMap.get(mov.item_id) || { sku: 'N/A', name: 'Unknown Item', unit_of_measure: 'units' },
    location: locMap.get(mov.location_id) || { name: 'Unknown', code: 'LOC' },
    dest_location: mov.destination_location_id ? locMap.get(mov.destination_location_id) : null,
    profiles: profileMap.get(mov.recorded_by) || { full_name: 'Staff Member', email: '' },
  }));

  return {
    movements: enrichedMovements,
    totalMatches: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize) || 1,
  };
}

export async function getAccessibleLocations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { locations: [], isManager: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isManager = profile?.role === 'manager';

  if (isManager) {
    const { data: allLocations } = await supabase
      .from('locations')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');

    return { locations: allLocations || [], isManager: true };
  } else {
    const { data: assignments } = await supabase
      .from('location_assignments')
      .select(`
        location_id,
        locations (
          id,
          name,
          code,
          is_active
        )
      `)
      .eq('user_id', user.id);

    const staffLocations = assignments
      ?.map((a: any) => a.locations)
      ?.filter((loc: any) => loc && loc.is_active) || [];

    return { locations: staffLocations, isManager: false };
  }
}
