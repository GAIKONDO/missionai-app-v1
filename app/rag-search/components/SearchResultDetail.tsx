'use client';

import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { entityTypeLabels, relationTypeLabels } from '../constants/labels';

interface SearchResultDetailProps {
  result: KnowledgeGraphSearchResult;
  onClose: () => void;
}

export default function SearchResultDetail({ result, onClose }: SearchResultDetailProps) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
          詳細情報
        </h2>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          閉じる
        </button>
      </div>

      {result.entity && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
            {result.entity.name}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>タイプ: </span>
              <span style={{ fontSize: '14px', color: '#1F2937' }}>
                {entityTypeLabels[result.entity.type] || result.entity.type}
              </span>
            </div>
            {result.entity.aliases && result.entity.aliases.length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>別名: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {result.entity.aliases.join(', ')}
                </span>
              </div>
            )}
            {result.entity.metadata && Object.keys(result.entity.metadata).length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(result.entity.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {result.relation && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
            {relationTypeLabels[result.relation.relationType] || result.relation.relationType}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.relation.description && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>説明: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {result.relation.description}
                </span>
              </div>
            )}
            {result.relation.confidence !== undefined && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>信頼度: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {(result.relation.confidence * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {result.relation.metadata && Object.keys(result.relation.metadata).length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(result.relation.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {result.type === 'topic' && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
            トピック
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>トピックID: </span>
              <span style={{ fontSize: '14px', color: '#1F2937' }}>{result.topicId}</span>
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>議事録ID: </span>
              <span style={{ fontSize: '14px', color: '#1F2937' }}>{result.meetingNoteId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

