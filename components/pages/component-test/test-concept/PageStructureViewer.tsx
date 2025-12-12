/**
 * ページ構造データビューアコンポーネント
 * Phase 3で生成された構造データを表示するためのデバッグ用コンポーネント
 */

'use client';

import { useState, useEffect } from 'react';
import { getPageStructure } from '@/lib/pageStructure';
import { ContentStructure, PageRelations, FormatPattern } from '@/types/pageMetadata';

interface PageStructureViewerProps {
  pageId: string;
  onClose: () => void;
}

export default function PageStructureViewer({ pageId, onClose }: PageStructureViewerProps) {
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState<{
    contentStructure?: ContentStructure;
    formatPattern?: FormatPattern;
    pageRelations?: PageRelations;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStructure = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPageStructure(pageId);
        setStructure(data);
      } catch (err) {
        console.error('構造データの読み込みエラー:', err);
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    if (pageId) {
      loadStructure();
    }
  }, [pageId]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}>
          <p>構造データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '800px',
          width: '90%',
        }}>
          <h3 style={{ marginBottom: '16px', color: '#EF4444' }}>エラー</h3>
          <p style={{ marginBottom: '16px', color: '#666' }}>{error}</p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '800px',
          width: '90%',
        }}>
          <h3 style={{ marginBottom: '16px' }}>構造データが見つかりません</h3>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            このページの構造データはまだ生成されていません。ページを更新すると自動的に生成されます。
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>📊 ページ構造データ</h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            閉じる
          </button>
        </div>

        {/* コンテンツ構造 */}
        {structure.contentStructure && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
              📝 コンテンツ構造
            </h3>
            <div style={{ fontSize: '14px', color: '#4B5563' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>文字数:</strong> {structure.contentStructure.wordCount?.toLocaleString()}文字
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>読了時間:</strong> 約{structure.contentStructure.readingTime}分
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>要素:</strong>
                <span style={{ marginLeft: '8px', display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
                  {structure.contentStructure.hasImages && <span style={{ padding: '2px 8px', backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: '4px' }}>画像</span>}
                  {structure.contentStructure.hasDiagrams && <span style={{ padding: '2px 8px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '4px' }}>図表</span>}
                  {structure.contentStructure.hasTables && <span style={{ padding: '2px 8px', backgroundColor: '#FCE7F3', color: '#9F1239', borderRadius: '4px' }}>テーブル</span>}
                  {structure.contentStructure.hasLists && <span style={{ padding: '2px 8px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '4px' }}>リスト</span>}
                </span>
              </div>
              {structure.contentStructure.headings && structure.contentStructure.headings.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <strong>見出し ({structure.contentStructure.headings.length}個):</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {structure.contentStructure.headings.map((heading, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>H{heading.level}</span>: {heading.text}
                        <span style={{ color: '#9CA3AF', fontSize: '12px', marginLeft: '8px' }}>
                          (位置: {heading.position}文字)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {structure.contentStructure.sections && structure.contentStructure.sections.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <strong>セクション ({structure.contentStructure.sections.length}個):</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {structure.contentStructure.sections.slice(0, 10).map((section, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{section.title}</span>
                        <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#E5E7EB', borderRadius: '4px', fontSize: '12px' }}>
                          {section.type}
                        </span>
                      </li>
                    ))}
                    {structure.contentStructure.sections.length > 10 && (
                      <li style={{ color: '#9CA3AF', fontSize: '12px' }}>
                        ...他{structure.contentStructure.sections.length - 10}個
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* フォーマットパターン */}
        {structure.formatPattern && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
              🎨 フォーマットパターン
            </h3>
            <div style={{ fontSize: '14px', color: '#4B5563' }}>
              {structure.formatPattern.layoutType && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>レイアウト:</strong> {structure.formatPattern.layoutType}
                </div>
              )}
              {structure.formatPattern.stylePattern && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>スタイル:</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                    {structure.formatPattern.stylePattern.hasKeyMessage && <li>キーメッセージあり</li>}
                    {structure.formatPattern.stylePattern.hasCards && <li>カードレイアウトあり</li>}
                    {structure.formatPattern.stylePattern.colorScheme && (
                      <li>カラースキーム: {structure.formatPattern.stylePattern.colorScheme}</li>
                    )}
                    {structure.formatPattern.stylePattern.visualElements && structure.formatPattern.stylePattern.visualElements.length > 0 && (
                      <li>視覚要素: {structure.formatPattern.stylePattern.visualElements.join(', ')}</li>
                    )}
                  </ul>
                </div>
              )}
              {structure.formatPattern.contentPattern && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>コンテンツパターン:</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                    {structure.formatPattern.contentPattern.structure && (
                      <li>構造: {structure.formatPattern.contentPattern.structure}</li>
                    )}
                    {structure.formatPattern.contentPattern.hasIntroduction && <li>導入部分あり</li>}
                    {structure.formatPattern.contentPattern.hasConclusion && <li>結論部分あり</li>}
                    {structure.formatPattern.contentPattern.hasCallToAction && <li>コールトゥアクションあり</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ページ間の関連性 */}
        {structure.pageRelations && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
              🔗 ページ間の関連性
            </h3>
            <div style={{ fontSize: '14px', color: '#4B5563' }}>
              {(structure.pageRelations.previousPageId || structure.pageRelations.nextPageId) && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>前後関係:</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                    {structure.pageRelations.previousPageId && (
                      <li>前のページ: {structure.pageRelations.previousPageId}</li>
                    )}
                    {structure.pageRelations.nextPageId && (
                      <li>次のページ: {structure.pageRelations.nextPageId}</li>
                    )}
                  </ul>
                </div>
              )}
              {structure.pageRelations.similarPages && structure.pageRelations.similarPages.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>類似ページ ({structure.pageRelations.similarPages.length}個):</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                    {structure.pageRelations.similarPages.map((sp, idx) => (
                      <li key={idx}>
                        {sp.pageId} (類似度: {(sp.similarity * 100).toFixed(1)}%)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {structure.pageRelations.references && structure.pageRelations.references.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>参照ページ ({structure.pageRelations.references.length}個):</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                    {structure.pageRelations.references.map((ref, idx) => (
                      <li key={idx}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
              {structure.pageRelations.topics && structure.pageRelations.topics.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>トピック:</strong>
                  <span style={{ marginLeft: '8px', display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
                    {structure.pageRelations.topics.map((topic, idx) => (
                      <span key={idx} style={{ padding: '2px 8px', backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: '4px', fontSize: '12px' }}>
                        {topic}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 生のJSONデータ */}
        <details style={{ marginTop: '24px' }}>
          <summary style={{ cursor: 'pointer', padding: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', fontSize: '14px', fontWeight: 500 }}>
            生のJSONデータを表示
          </summary>
          <pre style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#1F2937',
            color: '#F9FAFB',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '400px',
          }}>
            {JSON.stringify(structure, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

