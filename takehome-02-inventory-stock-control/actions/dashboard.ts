'use server';

import { createClient } from '../lib/supabase/server';

export interface CategoryBreakdown {
  id: string;
  name: string;
  itemCount: number;
  totalStock: number;
}

export interface LocationBreakdown {
  id: string;
  name: string;
  code: string;
  itemCount: number;
  totalStock: number;
}

export interface WeeklyVolume {
  weekLabel: string;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
}

export interface ExecutiveDashboardData {
  totalActiveItems: number;
  lowStockCount: number;
  activeLocationsCount: number;
  movementsToday: number;
  distinctItemsMovedThisWeek: number;
  categoryBreakdown: CategoryBreakdown[];
  locationBreakdown: LocationBreakdown[];
  weeklyVolume: WeeklyVolume[];
}

export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  const supabase = await createClient();

  const [{ data: items }, { data: categories }, { data: locations }, { data: movements }] = await Promise.all([
    supabase.from('items').select('id, name, sku, category_id, reorder_level, is_archived').eq('is_archived', false),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('locations').select('id, name, code, is_active').eq('is_active', true).order('name'),
    supabase.from('stock_movements').select('id, item_id, movement_type, quantity, location_id, destination_location_id, adjustment_direction, created_at').order('created_at', { ascending: false }),
  ]);

  const activeItems = items || [];
  const activeLocations = locations || [];
  const allCategories = categories || [];
  const allMovements = movements || [];

  const itemGlobalStockMap = new Map<string, number>();
  const itemLocStockMap = new Map<string, number>();

  allMovements.forEach((mov) => {
    const qty = Number(mov.quantity);
    const curGlobal = itemGlobalStockMap.get(mov.item_id) || 0;

    if (mov.movement_type === 'receipt') {
      itemGlobalStockMap.set(mov.item_id, curGlobal + qty);
      const key = `${mov.item_id}_${mov.location_id}`;
      itemLocStockMap.set(key, (itemLocStockMap.get(key) || 0) + qty);
    } else if (mov.movement_type === 'issue') {
      itemGlobalStockMap.set(mov.item_id, curGlobal - qty);
      const key = `${mov.item_id}_${mov.location_id}`;
      itemLocStockMap.set(key, (itemLocStockMap.get(key) || 0) - qty);
    } else if (mov.movement_type === 'transfer') {
      const srcKey = `${mov.item_id}_${mov.location_id}`;
      itemLocStockMap.set(srcKey, (itemLocStockMap.get(srcKey) || 0) - qty);
      if (mov.destination_location_id) {
        const destKey = `${mov.item_id}_${mov.destination_location_id}`;
        itemLocStockMap.set(destKey, (itemLocStockMap.get(destKey) || 0) + qty);
      }
    } else if (mov.movement_type === 'adjustment') {
      const delta = mov.adjustment_direction === 'decrease' ? -qty : qty;
      itemGlobalStockMap.set(mov.item_id, curGlobal + delta);
      const key = `${mov.item_id}_${mov.location_id}`;
      itemLocStockMap.set(key, (itemLocStockMap.get(key) || 0) + delta);
    }
  });

  let lowStockCount = 0;
  activeItems.forEach((it) => {
    const onHand = itemGlobalStockMap.get(it.id) || 0;
    if (onHand <= Number(it.reorder_level)) {
      lowStockCount++;
    }
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let movementsToday = 0;
  const weeklyItemIds = new Set<string>();

  allMovements.forEach((mov) => {
    const movTime = new Date(mov.created_at);
    if (movTime >= todayStart) {
      movementsToday++;
    }
    if (movTime >= oneWeekAgo) {
      weeklyItemIds.add(mov.item_id);
    }
  });

  const categoryBreakdown: CategoryBreakdown[] = allCategories.map((cat) => {
    const catItems = activeItems.filter((i) => i.category_id === cat.id);
    let totalStock = 0;
    catItems.forEach((i) => {
      totalStock += Math.max(0, itemGlobalStockMap.get(i.id) || 0);
    });
    return {
      id: cat.id,
      name: cat.name,
      itemCount: catItems.length,
      totalStock,
    };
  });

  const locationBreakdown: LocationBreakdown[] = activeLocations.map((loc) => {
    let locStock = 0;
    let distinctItems = 0;

    activeItems.forEach((item) => {
      const val = itemLocStockMap.get(`${item.id}_${loc.id}`) || 0;
      if (val > 0) {
        distinctItems++;
        locStock += val;
      }
    });

    return {
      id: loc.id,
      name: loc.name,
      code: loc.code,
      itemCount: distinctItems,
      totalStock: locStock,
    };
  });

  const weeklyVolume: WeeklyVolume[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const label = w === 0 ? 'This Week' : `${w}w ago`;

    let receipts = 0;
    let issues = 0;
    let transfers = 0;
    let adjustments = 0;

    allMovements.forEach((mov) => {
      const t = new Date(mov.created_at);
      if (t >= start && t < end) {
        const q = Number(mov.quantity);
        if (mov.movement_type === 'receipt') receipts += q;
        else if (mov.movement_type === 'issue') issues += q;
        else if (mov.movement_type === 'transfer') transfers += q;
        else if (mov.movement_type === 'adjustment') adjustments += q;
      }
    });

    weeklyVolume.push({
      weekLabel: label,
      receipts,
      issues,
      transfers,
      adjustments,
    });
  }

  return {
    totalActiveItems: activeItems.length,
    lowStockCount,
    activeLocationsCount: activeLocations.length,
    movementsToday,
    distinctItemsMovedThisWeek: weeklyItemIds.size,
    categoryBreakdown,
    locationBreakdown,
    weeklyVolume,
  };
}