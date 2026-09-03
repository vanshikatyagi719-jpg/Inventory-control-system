'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import LogoutButton from '../../components/LogoutButton';
import { importItemsCsvAction, importReceiptsCsvAction, exportStockCsvAction, ImportResult } from '../../actions/bulk';

export default function ImportExportPage() {
  const [itemsCsvText, setItemsCsvText] = useState('');
  const [receiptsCsvText, setReceiptsCsvText] = useState('');
  const [itemsResult, setItemsResult] = useState<ImportResult | null>(null);
  const [receiptsResult, setReceiptsResult] = useState<ImportResult | null>(null);
  const [isExporting, startExportTransition] = useTransition();
  const [isImportingItems, startItemsTransition] = useTransition();
  const [isImportingReceipts, startReceiptsTransition] = useTransition();

  const handleExport = () => {
    startExportTransition(async () => {
      const csvData = await exportStockCsvAction();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_stock_position_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleItemsImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemsCsvText.trim()) return;

    startItemsTransition(async () => {
      const res = await importItemsCsvAction(itemsCsvText);
      setItemsResult(res);
    });
  };

  const handleReceiptsImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptsCsvText.trim()) return;

    startReceiptsTransition(async () => {
      const res = await importReceiptsCsvAction(receiptsCsvText);
      setReceiptsResult(res);
    });
  };

  const sampleItemsCsv = `sku,name,description,category,unit_of_measure,reorder_level
FAST-BOLT-M8,M8 Zinc Coated Hex Bolt,High tensile fastener,Fasteners & Hardware,boxes,25
TOOL-WREN-10,10mm Ratcheting Combination Wrench,Chrome vanadium finish,Power Tools,units,10
SAFE-VEST-HI,High-Visibility Safety Vest (Orange),Class 2 reflective safety vest,Safety Equipment,units,30`;

  const sampleReceiptsCsv = `sku,quantity,location_code,reason
FAST-HEX-M10,100,WH-MAIN,PO-8821 Restock
TOOL-DRL-18V,20,RET-01,Store replenishment
SAFE-GLV-XL,50,SITE-N,Site supply drop`;

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '30px 40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>Bulk CSV Operations</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Import items and stock receipts with per-row validation, and export current stock positions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              style={{
                padding: '10px 18px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
              }}
            >
              {isExporting ? 'Generating CSV...' : '⬇ Export Current Stock Position (.csv)'}
            </button>
            <LogoutButton />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Link href="/" style={navStyle}>Dashboard</Link>
          <Link href="/items" style={navStyle}>Items</Link>
          <Link href="/locations" style={navStyle}>Locations</Link>
          <Link href="/movements" style={navStyle}>Stock Movements</Link>
          <Link href="/alerts" style={navStyle}>Low-Stock Alerts</Link>
          <Link href="/import-export" style={{ ...navStyle, backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>Bulk CSV</Link>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
          
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>1. Bulk Item Catalog Import</h2>
              <button
                type="button"
                onClick={() => setItemsCsvText(sampleItemsCsv)}
                style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Load Sample CSV
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#6b7280' }}>
              Required columns: <code>sku</code>, <code>name</code>, <code>category</code>. Optional: <code>description</code>, <code>unit_of_measure</code>, <code>reorder_level</code>.
            </p>

            <form onSubmit={handleItemsImport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                rows={7}
                value={itemsCsvText}
                onChange={(e) => setItemsCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                style={textareaStyle}
              />

              <button
                type="submit"
                disabled={isImportingItems || !itemsCsvText.trim()}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: isImportingItems || !itemsCsvText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isImportingItems ? 'Validating & Importing...' : 'Upload & Import Items'}
              </button>
            </form>

            {itemsResult && (
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: itemsResult.failedCount === 0 ? '#f0fdf4' : '#fffbeb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: itemsResult.failedCount === 0 ? '#166534' : '#92400e' }}>
                  Import Completed: {itemsResult.importedCount} succeeded, {itemsResult.failedCount} failed out of {itemsResult.totalRows} rows.
                </div>

                {itemsResult.errors.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#991b1b', marginBottom: '6px' }}>Row Validation Errors:</div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#b91c1c' }}>
                      {itemsResult.errors.map((err, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          Row {err.row} [{err.identifier}]: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>2. Bulk Stock Receipts Import</h2>
              <button
                type="button"
                onClick={() => setReceiptsCsvText(sampleReceiptsCsv)}
                style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Load Sample CSV
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#6b7280' }}>
              Required columns: <code>sku</code>, <code>quantity</code>, <code>location_code</code>. Optional: <code>reason</code>.
            </p>

            <form onSubmit={handleReceiptsImport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                rows={7}
                value={receiptsCsvText}
                onChange={(e) => setReceiptsCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                style={textareaStyle}
              />

              <button
                type="submit"
                disabled={isImportingReceipts || !receiptsCsvText.trim()}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: isImportingReceipts || !receiptsCsvText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isImportingReceipts ? 'Validating & Recording...' : 'Upload & Record Stock Receipts'}
              </button>
            </form>

            {receiptsResult && (
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: receiptsResult.failedCount === 0 ? '#f0fdf4' : '#fffbeb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: receiptsResult.failedCount === 0 ? '#166534' : '#92400e' }}>
                  Receipts Completed: {receiptsResult.importedCount} recorded, {receiptsResult.failedCount} failed out of {receiptsResult.totalRows} rows.
                </div>

                {receiptsResult.errors.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#991b1b', marginBottom: '6px' }}>Row Validation Errors:</div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#b91c1c' }}>
                      {receiptsResult.errors.map((err, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          Row {err.row} [{err.identifier}]: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}

const navStyle = {
  textDecoration: 'none',
  padding: '10px 16px',
  backgroundColor: 'white',
  border: '1px solid #ddd',
  borderRadius: '6px',
  color: '#333',
  fontSize: '14px',
  fontWeight: '500',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '12px',
  fontFamily: 'monospace',
  backgroundColor: '#f9fafb',
  boxSizing: 'border-box',
  resize: 'vertical',
};