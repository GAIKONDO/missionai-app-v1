'use client';

import React from 'react';
import type { Theme } from '@/lib/orgApi';

interface ThemeSelectionSectionProps {
  themes: Theme[];
  localThemeIds: string[];
  setLocalThemeIds: (ids: string[]) => void;
}

export default function ThemeSelectionSection({
  themes,
  localThemeIds,
  setLocalThemeIds,
}: ThemeSelectionSectionProps) {
  return (
    <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '16px' }}>
        関連テーマ（複数選択可能）
      </label>
      <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
        この注力施策が関連する分析ページのテーマを選択してください
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {themes.map((theme) => {
          const isSelected = localThemeIds.includes(theme.id);
          return (
            <label
              key={theme.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: `1px solid ${isSelected ? 'var(--color-primary)' : '#D1D5DB'}`,
                borderRadius: '6px',
                backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalThemeIds([...localThemeIds, theme.id]);
                  } else {
                    setLocalThemeIds(localThemeIds.filter(id => id !== theme.id));
                  }
                }}
                style={{ marginRight: '8px' }}
              />
              {theme.title}
            </label>
          );
        })}
      </div>
      {themes.length === 0 && (
        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
          テーマがありません。分析ページでテーマを作成してください。
        </div>
      )}
    </div>
  );
}

