'use client';

import dynamic from 'next/dynamic';
import type { FocusInitiative } from '@/lib/orgApi';
import { saveFocusInitiative } from '@/lib/orgApi';
import { generateUniqueId } from '@/lib/orgApi';

// MermaidDiagramを動的にインポート（SSRを無効化）
const MermaidDiagram = dynamic(
  () => import('@/components/pages/component-test/test-concept/MermaidDiagram'),
  { ssr: false }
);

interface MonetizationTabProps {
  initiative: FocusInitiative | null;
  setInitiative: (initiative: FocusInitiative) => void;
  initiativeId: string;
  localMonetizationDiagram: string;
  setLocalMonetizationDiagram: (diagram: string) => void;
  isEditingMonetization: boolean;
  setIsEditingMonetization: (editing: boolean) => void;
  setIsMonetizationUpdateModalOpen: (open: boolean) => void;
}

export default function MonetizationTab({
  initiative,
  setInitiative,
  initiativeId,
  localMonetizationDiagram,
  setLocalMonetizationDiagram,
  isEditingMonetization,
  setIsEditingMonetization,
  setIsMonetizationUpdateModalOpen,
}: MonetizationTabProps) {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: '600', color: '#374151', fontSize: '16px' }}>
            マネタイズ図
          </label>
          {initiative?.monetizationDiagramId && (
            <a
              href={`#monetization-${initiative.monetizationDiagramId}`}
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(initiative.monetizationDiagramId || '');
                alert(`マネタイズ図ID "${initiative.monetizationDiagramId}" をクリップボードにコピーしました`);
              }}
              style={{
                fontSize: '12px',
                color: '#3B82F6',
                textDecoration: 'none',
                padding: '2px 8px',
                backgroundColor: '#EFF6FF',
                borderRadius: '4px',
                border: '1px solid #BFDBFE',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DBEAFE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              title="マネタイズ図IDをクリップボードにコピー"
            >
              ({initiative.monetizationDiagramId})
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={async () => {
              if (!initiative) return;
              // monetizationDiagramIdが存在しない場合は生成
              if (!initiative.monetizationDiagramId) {
                const newId = `md_${generateUniqueId()}`;
                const updatedInitiative = {
                  ...initiative,
                  monetizationDiagramId: newId,
                };
                await saveFocusInitiative(updatedInitiative);
                setInitiative(updatedInitiative);
              }
              setIsMonetizationUpdateModalOpen(true);
            }}
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
          {!isEditingMonetization ? (
            <button
              onClick={() => setIsEditingMonetization(true)}
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
              onClick={() => {
                setIsEditingMonetization(false);
              }}
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
      
      {isEditingMonetization ? (
        <div>
          <textarea
            value={localMonetizationDiagram}
            onChange={(e) => setLocalMonetizationDiagram(e.target.value)}
            placeholder={`例:
graph TD
    A[顧客] -->|購入| B[商品・サービス]
    B -->|収益| C[売上]
    C -->|投資| D[事業拡大]
    D -->|提供| B`}
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
            💡 Mermaid図のコードを入力してください。フローチャート、シーケンス図、ガントチャートなどが作成できます。
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
            📖 <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Mermaid公式ドキュメント</a>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '16px' }}>
          {localMonetizationDiagram ? (
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '20px', backgroundColor: '#FFFFFF' }}>
              <MermaidDiagram
                diagramCode={localMonetizationDiagram}
                diagramId={`monetization-${initiativeId}`}
              />
            </div>
          ) : (
            <div style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              color: '#9CA3AF', 
              fontStyle: 'italic',
              border: '1px dashed #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#F9FAFB'
            }}>
              マネタイズ図がありません。編集ボタンから追加してください。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

