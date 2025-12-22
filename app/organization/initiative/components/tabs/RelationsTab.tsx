'use client';

import { useRouter } from 'next/navigation';
import type { FocusInitiative } from '@/lib/orgApi';
import InitiativeCauseEffectDiagram from '@/components/InitiativeCauseEffectDiagram';

interface RelationsTabProps {
  initiative: FocusInitiative;
  localCauseEffectCode: string;
  setLocalCauseEffectCode: (code: string) => void;
  localMethod: string[];
  localMeans: string[];
  localObjective: string;
  isEditingCauseEffect: boolean;
  setIsEditingCauseEffect: (editing: boolean) => void;
  setIsUpdateModalOpen: (open: boolean) => void;
}

export default function RelationsTab({
  initiative,
  localCauseEffectCode,
  setLocalCauseEffectCode,
  localMethod,
  localMeans,
  localObjective,
  isEditingCauseEffect,
  setIsEditingCauseEffect,
  setIsUpdateModalOpen,
}: RelationsTabProps) {
  const router = useRouter();

  // 特性要因図のコードからデータを取得
  let parsedCauseEffectData: { method?: string[]; means?: string[]; objective?: string } = {};
  try {
    if (localCauseEffectCode) {
      const parsed = JSON.parse(localCauseEffectCode);
      parsedCauseEffectData = {
        method: parsed.method || [],
        means: parsed.means || [],
        objective: parsed.objective || '',
      };
    }
  } catch (e) {
    // パースエラーの場合は既存のデータを使用
    parsedCauseEffectData = {
      method: localMethod,
      means: localMeans,
      objective: localObjective,
    };
  }

  const currentInitiativeData: FocusInitiative = {
    ...initiative,
    method: parsedCauseEffectData.method || localMethod,
    means: parsedCauseEffectData.means || localMeans,
    objective: parsedCauseEffectData.objective || localObjective,
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>
      
      {/* 特性要因図 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#374151', fontSize: '16px' }}>
              特性要因図
            </label>
            {initiative.causeEffectDiagramId && (
              <a
                href={`/analytics/cause-effect/${initiative.causeEffectDiagramId}`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/analytics/cause-effect/${initiative.causeEffectDiagramId}`);
                }}
                style={{
                  fontSize: '12px',
                  color: '#3B82F6',
                  fontFamily: 'monospace',
                  fontWeight: '400',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#EFF6FF',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DBEAFE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                }}
                title="特性要因図を開く"
              >
                ({initiative.causeEffectDiagramId})
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {initiative.causeEffectDiagramId && (
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                <span>📊</span>
                <span>図を更新する</span>
              </button>
            )}
            {!isEditingCauseEffect ? (
              <button
                onClick={() => setIsEditingCauseEffect(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                編集
              </button>
            ) : (
              <button
                onClick={() => setIsEditingCauseEffect(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6B7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                表示に戻る
              </button>
            )}
          </div>
        </div>
        {isEditingCauseEffect ? (
          <div>
            <textarea
              value={localCauseEffectCode}
              onChange={(e) => setLocalCauseEffectCode(e.target.value)}
              placeholder={`例:
{
  "spine": {
    "id": "spine",
    "label": "特性要因図",
    "type": "spine"
  },
  "method": ["手法1", "手法2"],
  "means": ["手段1", "手段2"],
  "objective": "目標の説明",
  "title": "タイトル",
  "description": "説明"
}`}
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
              💡 特性要因図のJSONコードを編集してください。手法（method）、手段（means）、目標（objective）を変更できます。
            </div>
          </div>
        ) : (
          <>
            <div style={{ 
              border: '1px solid #E5E7EB', 
              borderRadius: '6px', 
              padding: '20px', 
              backgroundColor: '#FFFFFF',
              minHeight: '600px',
              width: '100%',
              overflow: 'auto',
            }}>
              <InitiativeCauseEffectDiagram
                width={1400}
                height={700}
                initiative={currentInitiativeData}
              />
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
              💡 特性要因図は、この注力施策の手法・手段・目標を可視化しています。
              {!initiative.causeEffectDiagramId && (
                <span style={{ marginLeft: '8px', color: '#F59E0B' }}>
                  （保存すると特性要因図IDが自動生成されます）
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

