'use server';

import { createClient } from '../lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActiveAlert {
  itemId: string;
  sku: string;
  name: string;
  categoryName: string;
  unitOfMeasure: string;
  totalOnHand: number;
  reorderLevel: number;
  deficit: number;
}

export interface DismissedAlert {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  reason: string | null;
  stockLevelAtDismissal: number;
  dismissedAt: string;
  dismissedBy: string;
}

export async function getAlertsData() {
  const supabase = await createClient();

  const [{ data: items }, { data: categories }, { data: movements }, { data: dismissals }, { data: profiles }] = await Promise.all([
    supabase.from('items').select('id, sku, name, category_id, unit_of_measure, reorder_level, is_archived').eq('is_archived', false).order('name'),
    supabase.from('categories').select('id, name'),
    supabase.from('stock_movements').select('item_id, movement_type, quantity, adjustment_direction, created_at').order('created_at', { ascending: true }),
    supabase.from('alert_dismissals').select('*').order('dismissed_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email'),
  ]);

  const catMap = new Map((categories || []).map((c) => [c.id, c.name]));
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  const itemMap = new Map((items || []).map((i) => [i.id, i]));

  const itemMovementMap = new Map<string, any[]>();
  (movements || []).forEach((mov) => {
    const list = itemMovementMap.get(mov.item_id) || [];
    list.push(mov);
    itemMovementMap.set(mov.item_id, list);
  });

  const latestDismissalMap = new Map<string, any>();
  (dismissals || []).forEach((d) => {
    if (!latestDismissalMap.has(d.item_id)) {
      latestDismissalMap.set(d.item_id, d);
    }
  });

  const activeAlerts: ActiveAlert[] = [];

  (items || []).forEach((item) => {
    const movs = itemMovementMap.get(item.id) || [];
    let runningBalance = 0;
    let lastTimeAboveReorder: Date | null = null;

    movs.forEach((m) => {
      const qty = Number(m.quantity);
      if (m.movement_type === 'receipt') {
        runningBalance += qty;
      } else if (m.movement_type === 'issue') {
        runningBalance -= qty;
      } else if (m.movement_type === 'adjustment') {
        runningBalance += m.adjustment_direction === 'decrease' ? -qty : qty;
      }

      if (runningBalance > Number(item.reorder_level)) {
        lastTimeAboveReorder = new Date(m.created_at);
      }
    });

    const isCurrentlyLow = runningBalance <= Number(item.reorder_level);
    if (!isCurrentlyLow) return;

    const dismissal = latestDismissalMap.get(item.id);
    if (dismissal) {
      const dismissedTime = new Date(dismissal.dismissed_at);
      if (lastTimeAboveReorder && lastTimeAboveReorder > dismissedTime) {
        activeAlerts.push({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          categoryName: catMap.get(item.category_id) || 'Uncategorized',
          unitOfMeasure: item.unit_of_measure,
          totalOnHand: runningBalance,
          reorderLevel: Number(item.reorder_level),
          deficit: Number(item.reorder_level) - runningBalance,
        });
      }
    } else {
      activeAlerts.push({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        categoryName: catMap.get(item.category_id) || 'Uncategorized',
        unitOfMeasure: item.unit_of_measure,
        totalOnHand: runningBalance,
        reorderLevel: Number(item.reorder_level),
        deficit: Number(item.reorder_level) - runningBalance,
      });
    }
  });

  const dismissedList: DismissedAlert[] = (dismissals || []).map((d: any) => {
    const it = itemMap.get(d.item_id);
    const userId = d.dismissed_by || d.user_id;
    const prof = profileMap.get(userId);
    const stockVal = d.stock_at_dismissal ?? d.stock_level_at_dismissal ?? 0;

    return {
      id: d.id,
      itemId: d.item_id,
      sku: it?.sku || 'UNKNOWN',
      name: it?.name || 'Item',
      reason: d.reason,
      stockLevelAtDismissal: Number(stockVal),
      dismissedAt: d.dismissed_at,
      dismissedBy: prof?.full_name || prof?.email || 'Staff',
    };
  });

  return {
    activeAlerts,
    dismissedList,
  };
}

export async function dismissAlertAction(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const itemId = formData.get('item_id') as string;
  const reason = (formData.get('reason') as string)?.trim() || null;
  const currentStock = parseFloat((formData.get('current_stock') as string) || '0');

  if (!itemId) return { error: 'Item ID is required.' };

  const insertPayload: any = {
    item_id: itemId,
    dismissed_by: user.id,
    stock_at_dismissal: currentStock,
  };

  if (reason) {
    insertPayload.reason = reason;
  }

  const { error } = await supabase
    .from('alert_dismissals')
    .insert(insertPayload);

  if (error) {
    const { error: rpcError } = await supabase.rpc('dismiss_low_stock_alert', {
      p_item_id: itemId,
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error('Dismiss alert error:', rpcError.message);
      return { error: rpcError.message };
    }
  }

  revalidatePath('/alerts');
  revalidatePath('/');
  revalidatePath('/items');
  return { success: true };
}