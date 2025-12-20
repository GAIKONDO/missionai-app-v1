'use client';

import { useState } from 'react';
import type { OrgNodeData } from '@/components/OrgChart';
import { tauriAlert } from '@/lib/orgApi';

interface OrganizationInfoTabProps {
  organization: OrgNodeData | null;
  editingOrg: Partial<OrgNodeData>;
  setEditingOrg: (org: Partial<OrgNodeData>) => void;
  onDeleteClick?: () => void;
}

export default function OrganizationInfoTab({
  organization,
  editingOrg,
  setEditingOrg,
  onDeleteClick,
}: OrganizationInfoTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {organization?.id && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B', marginBottom: '4px' }}>
                危険な操作
              </div>
              <div style={{ fontSize: '12px', color: '#7F1D1D' }}>
                組織を削除すると、子組織とメンバーもすべて削除されます。
              </div>
            </div>
            <button
              onClick={async () => {
                if (organization && onDeleteClick) {
                  // 仮想的なルートノードは削除できない
                  if (organization.id === 'virtual-root') {
                    await tauriAlert('仮想的なルートノードは削除できません。実際の組織を選択してください。');
                    return;
                  }
                  onDeleteClick();
                }
              }}
              disabled={organization?.id === 'virtual-root'}
              style={{
                padding: '8px 16px',
                backgroundColor: organization?.id === 'virtual-root' ? '#9CA3AF' : '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: organization?.id === 'virtual-root' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: organization?.id === 'virtual-root' ? 0.5 : 1,
              }}
            >
              組織を削除
            </button>
          </div>
        </div>
      )}
      {organization?.id && (
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
            組織ID
          </label>
          <input
            type="text"
            value={organization.id}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              cursor: 'not-allowed',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
            このIDは変更できません。
          </div>
        </div>
      )}
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
          組織名 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          value={editingOrg.name || ''}
          onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
          placeholder="組織名を入力"
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
          英語名
        </label>
        <input
          type="text"
          value={editingOrg.title || ''}
          onChange={(e) => setEditingOrg({ ...editingOrg, title: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
          placeholder="英語名を入力"
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
          説明
        </label>
        <textarea
          value={editingOrg.description || ''}
          onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
            minHeight: '100px',
            resize: 'vertical',
          }}
          placeholder="説明を入力"
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
          表示順序
        </label>
        <input
          type="number"
          value={editingOrg.position || 0}
          onChange={(e) => setEditingOrg({ ...editingOrg, position: parseInt(e.target.value) || 0 })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
    </div>
  );
}
