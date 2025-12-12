/**
 * ページメタデータを表示するコンポーネント
 * デバッグ・確認用
 */

import { PageMetadata } from '@/types/pageMetadata';

interface PageMetadataViewerProps {
  page: PageMetadata;
  onClose?: () => void;
}

export default function PageMetadataViewer({ page, onClose }: PageMetadataViewerProps) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid var(--color-border-color)',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          ページメタデータ
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            閉じる
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 基本情報 */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
            基本情報
          </h4>
          <div style={{ fontSize: '13px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
            <div><strong>ID:</strong> {page.id}</div>
            <div><strong>タイトル:</strong> {page.title}</div>
            <div><strong>ページ番号:</strong> {page.pageNumber}</div>
            <div><strong>作成日時:</strong> {page.createdAt ? new Date(page.createdAt).toLocaleString('ja-JP') : '-'}</div>
            {page.updatedAt && (
              <div><strong>更新日時:</strong> {new Date(page.updatedAt).toLocaleString('ja-JP')}</div>
            )}
          </div>
        </div>

        {/* メタデータ */}
        {page.tags && page.tags.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              タグ
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {page.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#E3F2FD',
                    color: '#1976D2',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {page.contentType && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              コンテンツタイプ
            </h4>
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#F3E5F5',
              color: '#7B1FA2',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'inline-block',
            }}>
              {page.contentType}
            </div>
          </div>
        )}

        {page.semanticCategory && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              セマンティックカテゴリ
            </h4>
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#E8F5E9',
              color: '#2E7D32',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'inline-block',
            }}>
              {page.semanticCategory}
            </div>
          </div>
        )}

        {page.keywords && page.keywords.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              キーワード
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {page.keywords.map((keyword, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#FFF3E0',
                    color: '#E65100',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {page.sectionType && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              セクションタイプ
            </h4>
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#FCE4EC',
              color: '#C2185B',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'inline-block',
            }}>
              {page.sectionType}
            </div>
          </div>
        )}

        {page.importance && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              重要度
            </h4>
            <div style={{
              padding: '6px 12px',
              backgroundColor: page.importance === 'high' ? '#FFEBEE' : page.importance === 'medium' ? '#FFF3E0' : '#F5F5F5',
              color: page.importance === 'high' ? '#C62828' : page.importance === 'medium' ? '#E65100' : '#616161',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'inline-block',
            }}>
              {page.importance === 'high' ? '高' : page.importance === 'medium' ? '中' : '低'}
            </div>
          </div>
        )}

        {/* 生のJSONデータ（開発用） */}
        <details style={{ marginTop: '8px' }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--color-text-light)',
            padding: '8px',
            backgroundColor: '#F9FAFB',
            borderRadius: '4px',
          }}>
            JSONデータを表示
          </summary>
          <pre style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '4px',
            fontSize: '11px',
            overflowX: 'auto',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {JSON.stringify(page, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

