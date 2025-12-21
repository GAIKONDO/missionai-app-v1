'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * ChromaDBのコレクション構造セクション
 */
export function ChromaDBCollectionSection() {
  return (
    <CollapsibleSection 
      title="ChromaDBのコレクション構造" 
      defaultExpanded={false}
      id="chromadb-collection-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>コレクション名とデータ構造</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>エンティティコレクション: <code>entities_{'{'}organizationId{'}'}</code></h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>ID:</strong> SQLiteのエンティティIDと同じ（例: "entity_123"）</li>
            <li><strong>Embedding:</strong> エンティティ名 + エイリアス + メタデータを統合したテキストの埋め込みベクトル（1536次元）</li>
            <li><strong>Metadata:</strong> <code>{'{'}entityId, organizationId, name, type, aliases, metadata, createdAt, updatedAt{'}'}</code></li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>リレーションコレクション: <code>relations_{'{'}organizationId{'}'}</code></h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>ID:</strong> SQLiteのリレーションIDと同じ（例: "relation_456"）</li>
            <li><strong>Embedding:</strong> リレーションタイプ + ソース/ターゲットエンティティ名の埋め込みベクトル（1536次元）</li>
            <li><strong>Metadata:</strong> <code>{'{'}relationId, organizationId, type, sourceEntityId, targetEntityId, metadata, createdAt, updatedAt{'}'}</code></li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>トピックコレクション: <code>topics_{'{'}organizationId{'}'}</code></h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>ID:</strong> SQLiteのトピックIDと同じ（例: "topic_789"）</li>
            <li><strong>Embedding:</strong> トピックタイトル + 内容の埋め込みベクトル（1536次元）</li>
            <li><strong>Metadata:</strong> <code>{'{'}topicId, organizationId, title, semanticCategory, metadata, createdAt, updatedAt{'}'}</code></li>
          </ul>
        </div>
      </div>
    </CollapsibleSection>
  );
}

