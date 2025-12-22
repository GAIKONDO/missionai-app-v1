'use client';

import { useRef } from 'react';
import type { ImportPreview, MultiSectionImportPreview } from '@/lib/csvImport';
import { loadCSVPreview } from '@/lib/csvImport';

interface CsvImportSectionProps {
  onPreviewLoaded: (preview: ImportPreview | MultiSectionImportPreview) => void;
}

export default function CsvImportSection({ onPreviewLoaded }: CsvImportSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        データインポート
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        CSVファイルから組織、メンバー、事業会社のデータをインポートできます。
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            try {
              const preview = await loadCSVPreview(file);
              onPreviewLoaded(preview);
            } catch (error: any) {
              alert(`CSVファイルの読み込みに失敗しました: ${error.message}`);
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#FFFFFF',
            backgroundColor: 'var(--color-primary)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 150ms',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          📄 CSVファイルを選択
        </button>
      </div>
    </div>
  );
}

