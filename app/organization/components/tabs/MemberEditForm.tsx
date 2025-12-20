'use client';

import { useState } from 'react';
import type { MemberInfo } from '@/components/OrgChart';
import { tauriAlert } from '@/lib/orgApi';

interface MemberEditFormProps {
  member: MemberInfo & { id?: string };
  onSave: (updated: MemberInfo & { id?: string }) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export default function MemberEditForm({
  member,
  onSave,
  onCancel,
  onDelete,
}: MemberEditFormProps) {
  const [editedMember, setEditedMember] = useState<MemberInfo & { id?: string }>({ ...member });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          名前 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          value={editedMember.name}
          onChange={(e) => setEditedMember({ ...editedMember, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          役職
        </label>
        <input
          type="text"
          value={editedMember.title || ''}
          onChange={(e) => setEditedMember({ ...editedMember, title: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          名前（ローマ字）
        </label>
        <input
          type="text"
          value={editedMember.nameRomaji || ''}
          onChange={(e) => setEditedMember({ ...editedMember, nameRomaji: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          部署
        </label>
        <input
          type="text"
          value={editedMember.department || ''}
          onChange={(e) => setEditedMember({ ...editedMember, department: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          内線番号
        </label>
        <input
          type="text"
          value={editedMember.extension || ''}
          onChange={(e) => setEditedMember({ ...editedMember, extension: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          会社電話番号
        </label>
        <input
          type="text"
          value={editedMember.companyPhone || ''}
          onChange={(e) => setEditedMember({ ...editedMember, companyPhone: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          携帯電話番号
        </label>
        <input
          type="text"
          value={editedMember.mobilePhone || ''}
          onChange={(e) => setEditedMember({ ...editedMember, mobilePhone: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          メールアドレス
        </label>
        <input
          type="email"
          value={editedMember.email || ''}
          onChange={(e) => setEditedMember({ ...editedMember, email: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          伊藤忠メールアドレス
        </label>
        <input
          type="email"
          value={editedMember.itochuEmail || ''}
          onChange={(e) => setEditedMember({ ...editedMember, itochuEmail: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Teams情報
        </label>
        <input
          type="text"
          value={editedMember.teams || ''}
          onChange={(e) => setEditedMember({ ...editedMember, teams: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          従業員タイプ
        </label>
        <input
          type="text"
          value={editedMember.employeeType || ''}
          onChange={(e) => setEditedMember({ ...editedMember, employeeType: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          役割名
        </label>
        <input
          type="text"
          value={editedMember.roleName || ''}
          onChange={(e) => setEditedMember({ ...editedMember, roleName: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          インジケーター
        </label>
        <input
          type="text"
          value={editedMember.indicator || ''}
          onChange={(e) => setEditedMember({ ...editedMember, indicator: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          所在地
        </label>
        <input
          type="text"
          value={editedMember.location || ''}
          onChange={(e) => setEditedMember({ ...editedMember, location: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          階・ドア番号
        </label>
        <input
          type="text"
          value={editedMember.floorDoorNo || ''}
          onChange={(e) => setEditedMember({ ...editedMember, floorDoorNo: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          以前の名前
        </label>
        <input
          type="text"
          value={editedMember.previousName || ''}
          onChange={(e) => setEditedMember({ ...editedMember, previousName: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6B7280',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          キャンセル
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '8px 16px',
            backgroundColor: '#EF4444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          削除
        </button>
        <button
          onClick={async () => {
            if (!editedMember.name.trim()) {
              await tauriAlert('名前は必須です');
              return;
            }
            onSave(editedMember);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
