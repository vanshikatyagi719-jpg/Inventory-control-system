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

// 1. GET ITEMS (Server-side Search, Filtering, Sorting, Pagination)
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

  // 1. Query items with category info
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

  // Search by name or SKU
  if (search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
  }

  // Filter by Category
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Filter by Archived Status
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

  // 2. Fetch stock movements to compute dynamic balances per location and globally
  const itemIds = rawItems.map((i) => i.id);
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('item_id, movement_type, quantity, location_id, destination_location_id, adjustment_direction')
    .in('item_id', itemIds);

  // Map balances
  const globalStockMap = new Map<string, number>();
  const locationStockMap = new Map<string, number>(); // key: `${item_id}_${location_id}`

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
      // Outflow from source
      const srcKey = `${mov.item_id}_${mov.location_id}`;
      locationStockMap.set(srcKey, (locationStockMap.get(srcKey) || 0) - qty);
      // Inflow to destination
      if (mov.destination_location_id) {
        const destKey = `${mov.item_id}_${mov.destination_location_id}`;
        locationStockMap.set(destKey, (locationStockMap.get(destKey) || 0) + qty);
      }
      // Global stock remains unchanged on transfers
    } else if (mov.movement_type === 'adjustment') {
      const delta = mov.adjustment_direction === 'decrease' ? -qty : qty;
      globalStockMap.set(mov.item_id, currentGlobal + delta);
      const locKey = `${mov.item_id}_${mov.location_id}`;
      locationStockMap.set(locKey, (locationStockMap.get(locKey) || 0) + delta);
    }
  });

  // 3. Assemble and calculate low stock
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

  // Filter by Low Stock Only if requested
  if (lowStockOnly) {
    assembledItems = assembledItems.filter((i) => i.is_low_stock);
  }

  // Filter by Location if requested (keep items that have stock at that location or match query)
  if (locationId) {
    assembledItems = assembledItems.filter((i) => (i.location_on_hand ?? 0) > 0 || !lowStockOnly);
  }

  // 4. Server-Side Sorting
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

  // 5. Server-Side Pagination
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

// 2. GET ITEM BY ID (Details, Location Stock, Movements, Audit Log, Notes)
export async function getItemById(id: string) {
  const supabase = await createClient();

  // Item with Category
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

  // Locations list
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name');

  // Movements for this item (with profile full_name)
  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      id,
      movement_type,
      adjustment_direction,
      quantity,
      location_id,
      destination_location_id,
      reason,
      created_at,
      recorded_by,
      profiles (
        full_name,
        email
      ),
      location:locations!stock_movements_location_id_fkey (
        name,
        code
      ),
      dest_location:locations!stock_movements_destination_location_id_fkey (
        name,
        code
      )
    `)
    .eq('item_id', id)
    .order('created_at', { ascending: false });

  // Calculate stock per location
  const locationStock: { locationId: string; locationName: string; locationCode: string; onHand: number }[] = [];
  let totalOnHand = 0;

  locations?.forEach((loc) => {
    let locStock = 0;
    movements?.forEach((mov) => {
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

  // Audit Logs for this item
  const { data: auditLogs } = await supabase
    .from('item_audit_logs')
    .select(`
      id,
      field_name,
      old_value,
      new_value,
      created_at,
      profiles (
        full_name,
        email
      )
    `)
    .eq('item_id', id)
    .order('created_at', { ascending: false });

  // Staff Notes for this item
  const { data: notes } = await supabase
    .from('item_notes')
    .select(`
      id,
      note,
      created_at,
      profiles (
        full_name,
        email
      )
    `)
    .eq('item_id', id)
    .order('created_at', { ascending: false });

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

// 3. CREATE ITEM (Manager Only)
export async function createItemAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Verify Manager role
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

// 4. UPDATE ITEM (Manager Only)
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

// 5. ARCHIVE / RESTORE ITEM (Manager Only)
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

// 6. ADD STAFF NOTE (Staff & Managers)
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

// 7. GET CATEGORIES
export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, description')
    .order('name');

  return data || [];
}

// 8. GET LOCATIONS
export async function getLocations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('locations')
    .select('id, name, code, is_active')
    .eq('is_active', true)
    .order('name');

  return data || [];
}

// 9. GET USER ROLE
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
