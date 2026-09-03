import { createClient } from './server';

export interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  movementsToday: number;
  activeLocations: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        totalItems: 0,
        lowStockCount: 0,
        movementsToday: 0,
        activeLocations: 0,
      };
    }

    let totalItems = 0;
    let lowStockCount = 0;

    const { data: globalStock, error: stockError } = await supabase
      .from('v_item_global_stock')
      .select('item_id, is_low_stock, is_archived')
      .eq('is_archived', false);

    if (stockError) {
      const { count: itemsCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);

      totalItems = itemsCount ?? 0;
    } else if (globalStock) {
      totalItems = globalStock.length;
      lowStockCount = globalStock.filter((item) => item.is_low_stock).length;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: movementsToday } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    const { count: activeLocations } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    return {
      totalItems,
      lowStockCount,
      movementsToday: movementsToday ?? 0,
      activeLocations: activeLocations ?? 0,
    };
  } catch (err) {
    return {
      totalItems: 0,
      lowStockCount: 0,
      movementsToday: 0,
      activeLocations: 0,
    };
  }
}