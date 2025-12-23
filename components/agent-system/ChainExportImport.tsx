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
          padding: '10px 16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--color-text)',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-background)';
          e.currentTarget.style.borderColor = 'var(--color-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--color-surface)';
          e.currentTarget.style.borderColor = 'var(--color-border-color)';
        }}
      >
        <span>📤</span>
        エクスポート
      </button>
      <button
        onClick={() => {
          setShowImportModal(true);
          setImportError(null);
        }}
        style={{
          padding: '10px 16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--color-text)',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-background)';
          e.currentTarget.style.borderColor = 'var(--color-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--color-surface)';
          e.currentTarget.style.borderColor = 'var(--color-border-color)';
        }}
      >
        <span>📥</span>
        インポート
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
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--color-border-color)'
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  color: 'var(--color-text)',
                  marginBottom: '4px'
                }}>
                  チェーンをエクスポート
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--color-text-secondary)'
                }}>
                  JSON形式でチェーンデータをエクスポートします
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-background)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={exportData}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '16px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  lineHeight: '1.6',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCopyToClipboard}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-background)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface)';
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                }}
              >
                <span>📋</span>
                クリップボードにコピー
              </button>
              <button
                onClick={handleDownload}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(31, 41, 51, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(31, 41, 51, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(31, 41, 51, 0.1)';
                }}
              >
                <span>💾</span>
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
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--color-border-color)'
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  color: 'var(--color-text)',
                  marginBottom: '4px'
                }}>
                  チェーンをインポート
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--color-text-secondary)'
                }}>
                  JSONファイルまたはJSONデータをインポートします
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-background)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  marginBottom: '12px',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-background)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface)';
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                }}
              >
                <span>📁</span>
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
                  padding: '16px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {importError && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '12px 16px', 
                background: '#fee2e2', 
                borderRadius: '8px',
                border: '1px solid #fca5a5'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#dc2626',
                  fontWeight: 500
                }}>
                  {importError}
                </p>
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
                  padding: '10px 20px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-background)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface)';
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                disabled={!importData.trim()}
                style={{
                  padding: '10px 20px',
                  background: importData.trim() 
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)' 
                    : 'var(--color-surface)',
                  color: importData.trim() ? 'white' : 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: importData.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxShadow: importData.trim() ? '0 2px 4px rgba(31, 41, 51, 0.1)' : 'none',
                  opacity: importData.trim() ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (importData.trim()) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(31, 41, 51, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = importData.trim() 
                    ? '0 2px 4px rgba(31, 41, 51, 0.1)' 
                    : 'none';
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

