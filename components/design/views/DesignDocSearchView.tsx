'use client';

import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';

/**
 * 検索画面のコンポーネント
 * システム設計ドキュメントを検索するためのUIを提供します
 */
export interface DesignDocSearchViewProps {
  // 必要に応じてpropsを追加
}

export function DesignDocSearchView(props: DesignDocSearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: 'var(--color-surface)', 
      borderRadius: '8px',
      border: '1px solid var(--color-border-color)'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="システム設計ドキュメントを検索..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text)',
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                // 検索処理をここに実装
              }
            }}
          />
          <button
            onClick={() => {
              // 検索処理をここに実装
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FiSearch size={16} />
            検索
          </button>
        </div>
      </div>
      
      <div style={{ 
        padding: '24px', 
        textAlign: 'center',
        color: 'var(--color-text-light)'
      }}>
        <p>検索機能はここに実装されます</p>
      </div>
    </div>
  );
}
