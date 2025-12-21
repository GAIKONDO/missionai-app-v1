/**
 * チェーンのエクスポート/インポートコンポーネント
 */

'use client';

import { useState, useRef } from 'react';
import type { TaskChain } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';

interface ChainExportImportProps {
  chain: TaskChain;
  onImport?: (chain: TaskChain) => void;
}

export function ChainExportImport({ chain, onImport }: ChainExportImportProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // チェーンをJSON形式でエクスポート
  const handleExport = () => {
    const exportChain = {
      ...chain,
      nodes: Array.from(chain.nodes.entries()).map(([id, node]) => ({
        id,
        ...node,
      })),
    };
    const json = JSON.stringify(exportChain, null, 2);
    setExportData(json);
    setShowExportModal(true);
  };

  // エクスポートデータをクリップボードにコピー
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      alert('クリップボードにコピーしました');
    } catch (error) {
      alert('コピーに失敗しました');
    }
  };

  // エクスポートデータをファイルにダウンロード
  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chain.name || 'chain'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ファイルからインポート
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportData(text);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  // JSONデータからチェーンをインポート
  const handleImport = () => {
    try {
      setImportError(null);
      const imported = JSON.parse(importData);
      
      // バリデーション
      if (!imported.id || !imported.name || !imported.nodes) {
        throw new Error('無効なチェーンデータです');
      }

      // Map形式に変換
      const nodesMap = new Map();
      if (Array.isArray(imported.nodes)) {
        imported.nodes.forEach((node: any) => {
          nodesMap.set(node.id, {
            id: node.id,
            type: node.type,
            task: node.task,
            condition: node.condition,
            trueBranch: node.trueBranch,
            falseBranch: node.falseBranch,
            loopCount: node.loopCount,
            loopCondition: node.loopCondition,
            nextNodeId: node.nextNodeId,
          });
        });
      }

      const importedChain: TaskChain = {
        id: imported.id,
        name: imported.name,
        description: imported.description || '',
        startNodeId: imported.startNodeId || '',
        nodes: nodesMap,
        createdAt: imported.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (onImport) {
        onImport(importedChain);
      } else {
        const manager = getTaskChainManager();
        manager.registerChain(importedChain);
        alert('チェーンをインポートしました');
      }

      setShowImportModal(false);
      setImportData('');
    } catch (error: any) {
      setImportError(error.message || 'インポートに失敗しました');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={handleExport}
        style={{
          padding: '6px 12px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          color: 'var(--color-text)',
        }}
      >
        📤 エクスポート
      </button>
      <button
        onClick={() => {
          setShowImportModal(true);
          setImportError(null);
        }}
        style={{
          padding: '6px 12px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          color: 'var(--color-text)',
        }}
      >
        📥 インポート
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />

      {/* エクスポートモーダル */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              background: 'var(--color-background)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
                チェーンをエクスポート
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={exportData}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCopyToClipboard}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                }}
              >
                クリップボードにコピー
              </button>
              <button
                onClick={handleDownload}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                ファイルをダウンロード
              </button>
            </div>
          </div>
        </div>
      )}

      {/* インポートモーダル */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: 'var(--color-background)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
                チェーンをインポート
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  marginBottom: '12px',
                }}
              >
                ファイルを選択
              </button>
              <textarea
                value={importData}
                onChange={(e) => {
                  setImportData(e.target.value);
                  setImportError(null);
                }}
                placeholder="JSONデータを貼り付けるか、ファイルを選択してください"
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {importError && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#ffebee', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#c62828' }}>{importError}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                  setImportError(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                disabled={!importData.trim()}
                style={{
                  padding: '8px 16px',
                  background: importData.trim() ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: importData.trim() ? 'white' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: importData.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                }}
              >
                インポート
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

