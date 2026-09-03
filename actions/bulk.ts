'use server';

import { createClient } from '../lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RowError {
  row: number;
  identifier: string;
  error: string;
}

export interface ImportResult {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors: RowError[];
}

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const row: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(current.trim().replace(/^"(.*)"$/, '$1'));
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim().replace(/^"(.*)"$/, '$1'));
    return row;
  });
}

export async function importItemsCsvAction(csvContent: string): Promise<ImportResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'AUTH', error: 'You must be signed in to import items.' }],
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager') {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'AUTH', error: 'Only managers can bulk import items.' }],
    };
  }

  const rows = parseCsv(csvContent);
  if (rows.length <= 1) {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'CSV', error: 'CSV file is empty or missing data rows.' }],
    };
  }

  const header = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_]+/g, ''));
  const skuIdx = header.indexOf('sku');
  const nameIdx = header.indexOf('name');
  const descIdx = header.indexOf('description');
  const catIdx = header.indexOf('category');
  const uomIdx = header.indexOf('unitofmeasure') !== -1 ? header.indexOf('unitofmeasure') : header.indexOf('uom');
  const reorderIdx = header.indexOf('reorderlevel');

  if (skuIdx === -1 || nameIdx === -1 || catIdx === -1) {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'HEADER', error: 'Missing required header columns: sku, name, category.' }],
    };
  }

  const [{ data: categories }, { data: existingItems }] = await Promise.all([
    supabase.from('categories').select('id, name'),
    supabase.from('items').select('sku'),
  ]);

  const categoryMap = new Map((categories || []).map((c) => [c.name.toLowerCase().trim(), c.id]));
  const existingSkuSet = new Set((existingItems || []).map((i) => i.sku.toUpperCase()));

  const dataRows = rows.slice(1);
  const errors: RowError[] = [];
  let importedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const rowData = dataRows[i];

    if (rowData.length === 0 || rowData.every((cell) => !cell)) {
      continue;
    }

    const sku = (rowData[skuIdx] || '').trim().toUpperCase();
    const name = (rowData[nameIdx] || '').trim();
    const description = descIdx !== -1 ? (rowData[descIdx] || '').trim() || null : null;
    const categoryName = (rowData[catIdx] || '').trim();
    const uom = uomIdx !== -1 ? (rowData[uomIdx] || '').trim() || 'units' : 'units';
    const reorderVal = reorderIdx !== -1 ? parseFloat(rowData[reorderIdx] || '0') : 0;

    if (!sku) {
      errors.push({ row: rowNum, identifier: 'UNKNOWN', error: 'SKU cannot be empty.' });
      continue;
    }

    if (!name) {
      errors.push({ row: rowNum, identifier: sku, error: 'Item name cannot be empty.' });
      continue;
    }

    if (existingSkuSet.has(sku)) {
      errors.push({ row: rowNum, identifier: sku, error: `SKU "${sku}" already exists in the catalog.` });
      continue;
    }

    let categoryId = categoryMap.get(categoryName.toLowerCase());
    if (!categoryId) {
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert({ name: categoryName })
        .select('id')
        .single();

      if (catError || !newCat) {
        errors.push({ row: rowNum, identifier: sku, error: `Failed to create category "${categoryName}".` });
        continue;
      }
      categoryId = newCat.id;
      categoryMap.set(categoryName.toLowerCase(), categoryId);
    }

    if (isNaN(reorderVal) || reorderVal < 0) {
      errors.push({ row: rowNum, identifier: sku, error: 'Reorder level must be a non-negative number.' });
      continue;
    }

    const { error: insertError } = await supabase
      .from('items')
      .insert({
        sku,
        name,
        description,
        category_id: categoryId,
        unit_of_measure: uom,
        reorder_level: reorderVal,
      });

    if (insertError) {
      errors.push({ row: rowNum, identifier: sku, error: insertError.message });
    } else {
      existingSkuSet.add(sku);
      importedCount++;
    }
  }

  revalidatePath('/items');
  revalidatePath('/');

  return {
    totalRows: dataRows.length,
    importedCount,
    failedCount: errors.length,
    errors,
  };
}

export async function importReceiptsCsvAction(csvContent: string): Promise<ImportResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'AUTH', error: 'You must be signed in to record receipts.' }],
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isManager = profile?.role === 'manager';

  const rows = parseCsv(csvContent);
  if (rows.length <= 1) {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'CSV', error: 'CSV file is empty or missing data rows.' }],
    };
  }

  const header = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_]+/g, ''));
  const skuIdx = header.indexOf('sku');
  const qtyIdx = header.indexOf('quantity') !== -1 ? header.indexOf('quantity') : header.indexOf('qty');
  const locIdx = header.indexOf('locationcode') !== -1 ? header.indexOf('locationcode') : header.indexOf('location');
  const reasonIdx = header.indexOf('reason');

  if (skuIdx === -1 || qtyIdx === -1 || locIdx === -1) {
    return {
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      errors: [{ row: 0, identifier: 'HEADER', error: 'Missing required header columns: sku, quantity, location_code.' }],
    };
  }

  const [{ data: items }, { data: locations }, { data: assignments }] = await Promise.all([
    supabase.from('items').select('id, sku'),
    supabase.from('locations').select('id, code, is_active'),
    supabase.from('location_assignments').select('location_id').eq('user_id', user.id),
  ]);

  const itemMap = new Map((items || []).map((i) => [i.sku.toUpperCase(), i.id]));
  const locMap = new Map((locations || []).map((l) => [l.code.toUpperCase(), l]));
  const allowedLocationIds = new Set((assignments || []).map((a) => a.location_id));

  const dataRows = rows.slice(1);
  const errors: RowError[] = [];
  let importedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const rowData = dataRows[i];

    if (rowData.length === 0 || rowData.every((cell) => !cell)) {
      continue;
    }

    const sku = (rowData[skuIdx] || '').trim().toUpperCase();
    const qtyVal = parseFloat(rowData[qtyIdx] || '0');
    const locCode = (rowData[locIdx] || '').trim().toUpperCase();
    const reason = reasonIdx !== -1 ? (rowData[reasonIdx] || '').trim() || null : null;

    if (!sku) {
      errors.push({ row: rowNum, identifier: 'UNKNOWN', error: 'SKU cannot be empty.' });
      continue;
    }

    const itemId = itemMap.get(sku);
    if (!itemId) {
      errors.push({ row: rowNum, identifier: sku, error: `SKU "${sku}" not found in catalog.` });
      continue;
    }

    if (isNaN(qtyVal) || qtyVal <= 0) {
      errors.push({ row: rowNum, identifier: sku, error: 'Quantity must be a positive number greater than zero.' });
      continue;
    }

    const targetLoc = locMap.get(locCode);
    if (!targetLoc) {
      errors.push({ row: rowNum, identifier: sku, error: `Location code "${locCode}" not found.` });
      continue;
    }

    if (!targetLoc.is_active) {
      errors.push({ row: rowNum, identifier: sku, error: `Location "${locCode}" is currently inactive.` });
      continue;
    }

    if (!isManager && !allowedLocationIds.has(targetLoc.id)) {
      errors.push({ row: rowNum, identifier: sku, error: `Permission Denied: You are not assigned to location "${locCode}".` });
      continue;
    }

    const { error: rpcError } = await supabase.rpc('record_stock_movement', {
      p_item_id: itemId,
      p_movement_type: 'receipt',
      p_quantity: qtyVal,
      p_location_id: targetLoc.id,
      p_destination_location_id: null,
      p_adjustment_direction: null,
      p_reason: reason,
      p_user_id: user.id,
    });

    if (rpcError) {
      errors.push({ row: rowNum, identifier: sku, error: rpcError.message });
    } else {
      importedCount++;
    }
  }

  revalidatePath('/movements');
  revalidatePath('/items');
  revalidatePath('/');

  return {
    totalRows: dataRows.length,
    importedCount,
    failedCount: errors.length,
    errors,
  };
}

export async function exportStockCsvAction(): Promise<string> {
  const supabase = await createClient();

  const [{ data: items }, { data: locations }, { data: movements }, { data: categories }] = await Promise.all([
    supabase.from('items').select('id, sku, name, category_id, unit_of_measure, reorder_level, is_archived').order('name'),
    supabase.from('locations').select('id, name, code').eq('is_active', true).order('name'),
    supabase.from('stock_movements').select('item_id, movement_type, quantity, location_id, destination_location_id, adjustment_direction'),
    supabase.from('categories').select('id, name'),
  ]);

  const catMap = new Map((categories || []).map((c) => [c.id, c.name]));
  const globalStockMap = new Map<string, number>();
  const locStockMap = new Map<string, number>();

  (movements || []).forEach((mov) => {
    const qty = Number(mov.quantity);
    const curGlobal = globalStockMap.get(mov.item_id) || 0;

    if (mov.movement_type === 'receipt') {
      globalStockMap.set(mov.item_id, curGlobal + qty);
      const key = `${mov.item_id}_${mov.location_id}`;
      locStockMap.set(key, (locStockMap.get(key) || 0) + qty);
    } else if (mov.movement_type === 'issue') {
      globalStockMap.set(mov.item_id, curGlobal - qty);
      const key = `${mov.item_id}_${mov.location_id}`;
      locStockMap.set(key, (locStockMap.get(key) || 0) - qty);
    } else if (mov.movement_type === 'transfer') {
      const srcKey = `${mov.item_id}_${mov.location_id}`;
      locStockMap.set(srcKey, (locStockMap.get(srcKey) || 0) - qty);
      if (mov.destination_location_id) {
        const destKey = `${mov.item_id}_${mov.destination_location_id}`;
        locStockMap.set(destKey, (locStockMap.get(destKey) || 0) + qty);
      }
    } else if (mov.movement_type === 'adjustment') {
      const delta = mov.adjustment_direction === 'decrease' ? -qty : qty;
      globalStockMap.set(mov.item_id, curGlobal + delta);
      const key = `${mov.item_id}_${mov.location_id}`;
      locStockMap.set(key, (locStockMap.get(key) || 0) + delta);
    }
  });

  const locHeaders = (locations || []).map((l) => `"${l.name} (${l.code})"`);
  const headers = ['"SKU"', '"Item Name"', '"Category"', '"Status"', '"Total On Hand"', '"Reorder Level"', '"Unit of Measure"', '"Is Low Stock"', ...locHeaders];

  const lines: string[] = [headers.join(',')];

  (items || []).forEach((item) => {
    const totalOnHand = globalStockMap.get(item.id) || 0;
    const isLowStock = totalOnHand <= Number(item.reorder_level) ? 'YES' : 'NO';
    const status = item.is_archived ? 'Archived' : 'Active';
    const categoryName = catMap.get(item.category_id) || 'Uncategorized';

    const locCols = (locations || []).map((loc) => {
      const val = locStockMap.get(`${item.id}_${loc.id}`) || 0;
      return val.toString();
    });

    const row = [
      `"${item.sku}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${categoryName.replace(/"/g, '""')}"`,
      `"${status}"`,
      totalOnHand.toString(),
      item.reorder_level.toString(),
      `"${item.unit_of_measure}"`,
      `"${isLowStock}"`,
      ...locCols,
    ];

    lines.push(row.join(','));
  });

  return lines.join('\n');
}