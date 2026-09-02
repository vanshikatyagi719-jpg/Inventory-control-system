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

    // 1. Verify User Session first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn('getDashboardStats: User is not authenticated.');
      return {
        totalItems: 0,
        lowStockCount: 0,
        movementsToday: 0,
        activeLocations: 0,
      };
    }

    // 2. Fetch Active Items & Low Stock Count (with direct table fallback)
    let totalItems = 0;
    let lowStockCount = 0;

    const { data: globalStock, error: stockError } = await supabase
      .from('v_item_global_stock')
      .select('item_id, is_low_stock, is_archived')
      .eq('is_archived', false);

    if (stockError) {
      console.warn('v_item_global_stock query notice:', stockError.message || stockError);
      
      // Graceful fallback to direct items table
      const { count: itemsCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);

      totalItems = itemsCount ?? 0;
    } else if (globalStock) {
      totalItems = globalStock.length;
      lowStockCount = globalStock.filter((item) => item.is_low_stock).length;
    }

    // 3. Fetch Movements Recorded Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: movementsToday, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    if (movementsError) {
      console.warn('stock_movements query notice:', movementsError.message || movementsError);
    }

    // 4. Fetch Active Locations Count
    const { count: activeLocations, error: locationsError } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (locationsError) {
      console.warn('locations query notice:', locationsError.message || locationsError);
    }

    return {
      totalItems,
      lowStockCount,
      movementsToday: movementsToday ?? 0,
      activeLocations: activeLocations ?? 0,
    };
  } catch (err) {
    console.error('Unexpected error in getDashboardStats:', err);
    return {
      totalItems: 0,
      lowStockCount: 0,
      movementsToday: 0,
      activeLocations: 0,
    };
  }
}