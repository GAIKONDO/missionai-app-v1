'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * Agentの種類と役割セクション
 */
export function AgentTypesSection() {
  return (
    <CollapsibleSection 
      title="Agentの種類と役割" 
      defaultExpanded={false}
      id="agent-types-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>実装済みAgent</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>1. SearchAgent（検索Agent）</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>役割:</strong> 検索タスクに特化したAgent</li>
            <li><strong>能力:</strong> ナレッジグラフや設計ドキュメントの検索</li>
            <li><strong>使用Tool:</strong> search_knowledge_graph</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>2. AnalysisAgent（分析Agent）</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>役割:</strong> 分析タスクに特化したAgent</li>
            <li><strong>能力:</strong> データやトピックを分析して洞察を抽出</li>
            <li><strong>特徴:</strong> パターン、傾向、洞察の抽出、アクション可能な推奨事項の提供</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>3. GenerationAgent（生成Agent）</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>役割:</strong> 生成タスクに特化したAgent</li>
            <li><strong>能力:</strong> テキスト、要約、レポートなどの生成</li>
            <li><strong>特徴:</strong> 正確で構造化された読みやすい形式でコンテンツを生成</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>4. ValidationAgent（検証Agent）</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>役割:</strong> 検証タスクに特化したAgent</li>
            <li><strong>能力:</strong> データの整合性、品質、正確性を検証</li>
            <li><strong>特徴:</strong> 明確な検証結果と問題があれば具体的な指摘</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>5. GeneralAgent（汎用Agent）</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>役割:</strong> 様々なタスクを処理できる汎用Agent</li>
            <li><strong>能力:</strong> 複数のタスクタイプに対応</li>
            <li><strong>特徴:</strong> 特定のAgentが対応できないタスクを処理</li>
          </ul>
        </div>
      </div>
    </CollapsibleSection>
  );
}

