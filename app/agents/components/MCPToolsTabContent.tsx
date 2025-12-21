/**
 * MCPツール一覧タブコンテンツ
 */

'use client';

import { useState, useEffect } from 'react';
import type { MCPTool } from '@/lib/mcp/types';
import { listAvailableTools } from '@/lib/mcp/tools';
import { loadAllMCPToolsWithMetadata, type MCPToolWithMetadata } from '@/lib/mcp/toolStorage';
import { MCPToolCard } from './MCPToolCard';
import { MCPToolDetailModal } from './MCPToolDetailModal';

export function MCPToolsTabContent() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [toolsMetadata, setToolsMetadata] = useState<Map<string, MCPToolWithMetadata>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [selectedToolMetadata, setSelectedToolMetadata] = useState<MCPToolWithMetadata | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 少し遅延を入れてMCPツールの初期化を待つ
    const timer = setTimeout(() => {
      loadTools();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      // メモリ内のツール（実行可能なツール）
      const availableTools = await listAvailableTools();
      setTools(availableTools);
      
      // データベースからメタデータを取得
      const metadataList = await loadAllMCPToolsWithMetadata();
      const metadataMap = new Map<string, MCPToolWithMetadata>();
      for (const meta of metadataList) {
        metadataMap.set(meta.name, meta);
      }
      setToolsMetadata(metadataMap);
    } catch (err: any) {
      console.error('MCPツール一覧取得エラー:', err);
      setError(err.message || 'MCPツール一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#F44336', marginBottom: '16px' }}>エラー: {error}</p>
        <button
          onClick={loadTools}
          style={{
            padding: '8px 16px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>登録されているMCPツールがありません。</p>
        <button
          onClick={loadTools}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  const handleToolClick = (tool: MCPTool) => {
    setSelectedTool(tool);
    setSelectedToolMetadata(toolsMetadata.get(tool.name) || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTool(null);
    setSelectedToolMetadata(null);
  };

  const handleToolUpdate = () => {
    // ツールが更新されたら再読み込み
    loadTools();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>
          MCPツール一覧
        </h2>
        <button
          onClick={loadTools}
          style={{
            padding: '6px 12px',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-color)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          更新
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {tools.map((tool) => {
          const metadata = toolsMetadata.get(tool.name);
          return (
            <MCPToolCard
              key={tool.name}
              tool={tool}
              metadata={metadata}
              onClick={() => handleToolClick(tool)}
              onEnabledChange={handleToolUpdate}
            />
          );
        })}
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <p style={{ margin: 0 }}>
          合計 {tools.length} 個のMCPツールが登録されています。
        </p>
      </div>

      <MCPToolDetailModal
        isOpen={isModalOpen}
        tool={selectedTool}
        metadata={selectedToolMetadata}
        onClose={handleCloseModal}
        onUpdate={handleToolUpdate}
      />
    </div>
  );
}

