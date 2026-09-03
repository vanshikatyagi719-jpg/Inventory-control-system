'use server';

import { createClient } from '../lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ItemQueryFilters {
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: 'active' | 'archived' | 'all';
  lowStockOnly?: boolean;
  sortBy?: 'name' | 'on_hand' | 'reorder_level' | 'sku';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ItemListItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string;
  category_name: string;
  unit_of_measure: string;
  reorder_level: number;
  is_archived: boolean;
  total_on_hand: number;
  location_on_hand?: number;
  is_low_stock: boolean;
}

export interface GetItemsResult {
  items: ItemListItem[];
  totalMatches: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getItems(filters: ItemQueryFilters = {}): Promise<GetItemsResult> {
  const supabase = await createClient();

  const {
    search = '',
    categoryId = '',
    locationId = '',
    status = 'active',
    lowStockOnly = false,
    sortBy = 'name',
    sortDir = 'asc',
    page = 1,
    pageSize = 10,
  } = filters;

  let query = supabase
    .from('items')
    .select(`
      id,
      sku,
      name,
      description,
      category_id,
      unit_of_measure,
      reorder_level,
      is_archived,
      created_at,
      categories (
        name
      )
    `);

  if (search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (status === 'active') {
    query = query.eq('is_archived', false);
  } else if (status === 'archived') {
    query = query.eq('is_archived', true);
  }

  const { data: rawItems, error: itemsError } = await query;

  if (itemsError || !rawItems) {
    console.error('Error fetching items:', itemsError?.message);
    return { items: [], totalMatches: 0, page, pageSize, totalPages: 0 };
  }

  const itemIds = rawItems.map((i) => i.id);
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('item_id, movement_type, quantity, location_id, destination_location_id, adjustment_direction')
    .in('item_id', itemIds);

  const globalStockMap = new Map<string, number>();
  const locationStockMap = new Map<string, number>();

  movements?.forEach((mov) => {
    const qty = Number(mov.quantity);
    const currentGlobal = globalStockMap.get(mov.item_id) || 0;

    if (mov.movement_type === 'receipt') {
      globalStockMap.set(mov.item_id, currentGlobal + qty);
      const locKey = `${mov.item_id}_${mov.location_id}`;
      locationStockMap.set(locKey, (locationStockMap.get(locKey) || 0) + qty);
    } else if (mov.movement_type === 'issue') {
      globalStockMap.set(mov.item_id, currentGlobal - qty);
      const locKey = `${mov.item_id}_${mov.location_id}`;
      locationStockMap.set(locKey, (locationStockMap.get(locKey) || 0) - qty);
    } else if (mov.movement_type === 'transfer') {
      const srcKey = `${mov.item_id}_${mov.location_id}`;
      locationStockMap.set(srcKey, (locationStockMap.get(srcKey) || 0) - qty);
      if (mov.destination_location_id) {
        const destKey = `${mov.item_id}_${mov.destination_location_id}`;
        locationStockMap.set(destKey, (locationStockMap.get(destKey) || 0) + qty);
      }
    } else if (mov.movement_type === 'adjustment') {
      const delta = mov.adjustment_direction === 'decrease' ? -qty : qty;
      globalStockMap.set(mov.item_id, currentGlobal + delta);
      const locKey = `${mov.item_id}_${mov.location_id}`;
      locationStockMap.set(locKey, (locationStockMap.get(locKey) || 0) + delta);
    }
  });

  let assembledItems: ItemListItem[] = rawItems.map((item: any) => {
    const total_on_hand = globalStockMap.get(item.id) || 0;
    const locKey = `${item.id}_${locationId}`;
    const location_on_hand = locationId ? locationStockMap.get(locKey) || 0 : undefined;
    const is_low_stock = total_on_hand <= Number(item.reorder_level);

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category_id: item.category_id,
      category_name: item.categories?.name || 'Uncategorized',
      unit_of_measure: item.unit_of_measure,
      reorder_level: Number(item.reorder_level),
      is_archived: item.is_archived,
      total_on_hand,
      location_on_hand,
      is_low_stock,
    };
  });

  if (lowStockOnly) {
    assembledItems = assembledItems.filter((i) => i.is_low_stock);
  }

  if (locationId) {
    assembledItems = assembledItems.filter((i) => (i.location_on_hand ?? 0) > 0 || !lowStockOnly);
  }

  assembledItems.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'sku') {
      comparison = a.sku.localeCompare(b.sku);
    } else if (sortBy === 'on_hand') {
      const aVal = locationId ? (a.location_on_hand ?? 0) : a.total_on_hand;
      const bVal = locationId ? (b.location_on_hand ?? 0) : b.total_on_hand;
      comparison = aVal - bVal;
    } else if (sortBy === 'reorder_level') {
      comparison = a.reorder_level - b.reorder_level;
    }

    return sortDir === 'desc' ? -comparison : comparison;
  });

  const totalMatches = assembledItems.length;
  const totalPages = Math.ceil(totalMatches / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = assembledItems.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    totalMatches,
    page,
    pageSize,
    totalPages,
  };
}

export async function getItemById(id: string) {
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select(`
      id,
      sku,
      name,
      description,
      category_id,
      unit_of_measure,
      reorder_level,
      is_archived,
      created_at,
      updated_at,
      categories (
        id,
        name
      )
    `)
    .eq('id', id)
    .single();

  if (itemError || !item) {
    return null;
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name');

  const { data: rawMovements } = await supabase
    .from('stock_movements')
    .select('id, movement_type, adjustment_direction, quantity, location_id, destination_location_id, reason, created_at, recorded_by')
    .eq('item_id', id)
    .order('created_at', { ascending: false });

  const userIds = Array.from(new Set([
    ...(rawMovements?.map((m) => m.recorded_by) || []),
  ]));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));
  const locMap = new Map(locations?.map((l) => [l.id, l]));

  const movements = (rawMovements || []).map((mov) => ({
    ...mov,
    location: locMap.get(mov.location_id) || { name: 'Unknown', code: 'LOC' },
    dest_location: mov.destination_location_id ? locMap.get(mov.destination_location_id) : null,
    profiles: profileMap.get(mov.recorded_by) || { full_name: 'Staff Member', email: '' },
  }));

  const locationStock: { locationId: string; locationName: string; locationCode: string; onHand: number }[] = [];
  let totalOnHand = 0;

  locations?.forEach((loc) => {
    let locStock = 0;
    movements.forEach((mov) => {
      const qty = Number(mov.quantity);
      if (mov.movement_type === 'receipt' && mov.location_id === loc.id) {
        locStock += qty;
      } else if (mov.movement_type === 'issue' && mov.location_id === loc.id) {
        locStock -= qty;
      } else if (mov.movement_type === 'transfer') {
        if (mov.location_id === loc.id) locStock -= qty;
        if (mov.destination_location_id === loc.id) locStock += qty;
      } else if (mov.movement_type === 'adjustment' && mov.location_id === loc.id) {
        locStock += mov.adjustment_direction === 'decrease' ? -qty : qty;
      }
    });

    totalOnHand += locStock;
    locationStock.push({
      locationId: loc.id,
      locationName: loc.name,
      locationCode: loc.code,
      onHand: locStock,
    });
  });

  const { data: rawAuditLogs } = await supabase
    .from('item_audit_logs')
    .select('id, field_name, old_value, new_value, created_at, changed_by')
    .eq('item_id', id)
    .order('created_at', { ascending: false });

  const { data: rawNotes } = await supabase
    .from('item_notes')
    .select('id, note, created_at, author_id')
    .eq('item_id', id)
    .order('created_at', { ascending: false });

  const extraUserIds = Array.from(new Set([
    ...(rawAuditLogs?.map((a) => a.changed_by).filter(Boolean) as string[] || []),
    ...(rawNotes?.map((n) => n.author_id).filter(Boolean) as string[] || []),
  ]));

  let extraProfileMap = profileMap;
  if (extraUserIds.length > 0) {
    const { data: extraProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', extraUserIds);
    extraProfiles?.forEach((p) => extraProfileMap.set(p.id, p));
  }

  const auditLogs = (rawAuditLogs || []).map((log) => ({
    ...log,
    profiles: log.changed_by ? extraProfileMap.get(log.changed_by) : null,
  }));

  const notes = (rawNotes || []).map((note) => ({
    ...note,
    profiles: note.author_id ? extraProfileMap.get(note.author_id) : null,
  }));

  return {
    item: {
      ...item,
      category_name: (item.categories as any)?.name || 'Uncategorized',
      total_on_hand: totalOnHand,
      is_low_stock: totalOnHand <= Number(item.reorder_level),
    },
    locationStock,
    movements: movements || [],
    auditLogs: auditLogs || [],
    notes: notes || [],
  };
}

export async function createItemAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return { error: 'Only inventory managers can create items.' };
  }

  const sku = (formData.get('sku') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const category_id = formData.get('category_id') as string;
  const unit_of_measure = (formData.get('unit_of_measure') as string)?.trim() || 'units';
  const reorder_level = Number(formData.get('reorder_level') || 0);

  if (!sku || !name || !category_id) {
    return { error: 'SKU, Name, and Category are required.' };
  }

  if (reorder_level < 0) {
    return { error: 'Reorder level cannot be negative.' };
  }

  const { data: newItem, error } = await supabase
    .from('items')
    .insert({
      sku,
      name,
      description,
      category_id,
      unit_of_measure,
      reorder_level,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/items');
  revalidatePath('/');
  return { success: true, id: newItem.id };
}

export async function updateItemAction(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return { error: 'Only inventory managers can edit items.' };
  }

  const sku = (formData.get('sku') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const category_id = formData.get('category_id') as string;
  const unit_of_measure = (formData.get('unit_of_measure') as string)?.trim() || 'units';
  const reorder_level = Number(formData.get('reorder_level') || 0);

  if (!sku || !name || !category_id) {
    return { error: 'SKU, Name, and Category are required.' };
  }

  const { error } = await supabase
    .from('items')
    .update({
      sku,
      name,
      description,
      category_id,
      unit_of_measure,
      reorder_level,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/items/${id}`);
  revalidatePath('/items');
  revalidatePath('/');
  return { success: true };
}

export async function toggleArchiveItemAction(id: string, isArchived: boolean) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return { error: 'Only inventory managers can archive or restore items.' };
  }

  const { error } = await supabase
    .from('items')
    .update({ is_archived: isArchived })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/items/${id}`);
  revalidatePath('/items');
  revalidatePath('/');
  return { success: true };
}

export async function addItemNoteAction(itemId: string, note: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  if (!note.trim()) {
    return { error: 'Note content cannot be empty.' };
  }

  const { error } = await supabase
    .from('item_notes')
    .insert({
      item_id: itemId,
      note: note.trim(),
      author_id: user.id,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/items/${itemId}`);
  return { success: true };
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, description')
    .order('name');

  return data || [];
}

export async function getLocations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('locations')
    .select('id, name, code, is_active')
    .eq('is_active', true)
    .order('name');

  return data || [];
}

export async function getUserRole(): Promise<'manager' | 'staff' | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return data?.role || 'staff';
}
