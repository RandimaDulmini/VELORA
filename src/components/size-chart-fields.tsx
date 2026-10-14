'use client';

import { useState } from 'react';
import type { SizeGuideRow } from '@/lib/types';

const emptyRow: SizeGuideRow = { size: '', bust: '', waist: '', hips: '' };

export function SizeChartFields({ initialRows }: { initialRows: SizeGuideRow[] }) {
  const [rows, setRows] = useState(() => (initialRows.length ? initialRows : [{ ...emptyRow }]));
  const updateRow = (index: number, field: keyof SizeGuideRow, value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div className="size-chart-editor">
      <div className="size-chart-editor-row size-chart-editor-head" aria-hidden="true">
        <span>Size</span>
        <span>Bust / chest (cm)</span>
        <span>Waist (cm)</span>
        <span>Hips (cm)</span>
        <span />
      </div>
      {rows.map((row, index) => (
        <div className="size-chart-editor-row" key={index}>
          <label>
            <span>Size</span>
            <input
              name="size_chart_size"
              required
              maxLength={20}
              value={row.size}
              onChange={(event) => updateRow(index, 'size', event.target.value)}
            />
          </label>
          <label>
            <span>Bust / chest (cm)</span>
            <input
              name="size_chart_bust"
              required
              maxLength={20}
              placeholder="e.g. 86–89"
              value={row.bust}
              onChange={(event) => updateRow(index, 'bust', event.target.value)}
            />
          </label>
          <label>
            <span>Waist (cm)</span>
            <input
              name="size_chart_waist"
              required
              maxLength={20}
              placeholder="e.g. 68–71"
              value={row.waist}
              onChange={(event) => updateRow(index, 'waist', event.target.value)}
            />
          </label>
          <label>
            <span>Hips (cm)</span>
            <input
              name="size_chart_hips"
              required
              maxLength={20}
              placeholder="e.g. 91–94"
              value={row.hips}
              onChange={(event) => updateRow(index, 'hips', event.target.value)}
            />
          </label>
          <button
            className="text-button danger"
            type="button"
            disabled={rows.length === 1}
            onClick={() =>
              setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
            }
            aria-label={`Remove ${row.size || `row ${index + 1}`}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="button secondary compact"
        type="button"
        disabled={rows.length >= 20}
        onClick={() => setRows((current) => [...current, { ...emptyRow }])}
      >
        Add size row
      </button>
    </div>
  );
}
