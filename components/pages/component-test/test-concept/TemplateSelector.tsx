/**
 * テンプレート選択モーダルコンポーネント
 * 画面いっぱいのモーダルでテンプレートのプレビューを一覧表示
 */

'use client';

import { useState, useEffect } from 'react';
import { getUserTemplates, PageTemplate } from '@/lib/pageTemplates';
import { stripHtml } from '@/lib/pageMetadataUtils';
import dynamic from 'next/dynamic';

// DynamicPageを動的インポート（SSRを回避）
const DynamicPage = dynamic(
  () => import('./DynamicPage'),
  { ssr: false }
);

interface TemplateSelectorProps {
  planId?: string;
  conceptId?: string;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export default function TemplateSelector({
  planId,
  conceptId,
  onSelect,
  onClose,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [planId, conceptId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedTemplates = await getUserTemplates(planId, conceptId);
      setTemplates(loadedTemplates);
    } catch (err) {
      console.error('テンプレート読み込みエラー:', err);
      setError(err instanceof Error ? err.message : 'テンプレートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedTemplateId) {
      onSelect(selectedTemplateId);
      onClose();
    }
  };

  // HTMLコンテンツのプレビューを生成（最初の200文字程度）
  const getPreviewContent = (html: string): string => {
    const text = stripHtml(html);
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            📋 テンプレートを選択
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>

        {/* コンテンツエリア */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              読み込み中...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                color: '#991B1B',
              }}
            >
              {error}
            </div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>
              テンプレートが登録されていません
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                gap: '20px',
              }}
            >
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  style={{
                    border: selectedTemplateId === template.id ? '3px solid #8B5CF6' : '2px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: selectedTemplateId === template.id ? '#F5F3FF' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTemplateId !== template.id) {
                      e.currentTarget.style.borderColor = '#8B5CF6';
                      e.currentTarget.style.backgroundColor = '#FAF5FF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTemplateId !== template.id) {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  {/* テンプレート名と説明 */}
                  <div style={{ marginBottom: '12px' }}>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: '4px',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: selectedTemplateId === template.id ? '#8B5CF6' : 'var(--color-text)',
                      }}
                    >
                      {template.name}
                    </h3>
                    {template.description && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: 'var(--color-text-light)',
                        }}
                      >
                        {template.description}
                      </p>
                    )}
                  </div>

                  {/* 元のページ情報 */}
                  <div
                    style={{
                      marginBottom: '12px',
                      padding: '8px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'var(--color-text-light)',
                    }}
                  >
                    <div>元のページ: {template.pageTitle}</div>
                    <div>ページID: {template.pageId}</div>
                  </div>

                  {/* プレビュー */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--color-text-light)',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>プレビュー:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTemplateId(template.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#8B5CF6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        🔍 拡大
                      </button>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTemplateId(template.id);
                      }}
                      style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#8B5CF6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          padding: '12px',
                          backgroundColor: '#FFFFFF',
                          transform: 'scale(0.25)',
                          transformOrigin: 'top left',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                        }}>
                          <div style={{
                            width: '400%',
                            height: '400%',
                          }}>
                            <DynamicPage
                              pageId={template.pageId}
                              pageNumber={1}
                              title={template.pageTitle}
                              content={template.pageContent}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 選択インジケーター */}
                  {selectedTemplateId === template.id && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: '#8B5CF6',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        textAlign: 'center',
                      }}
                    >
                      ✓ 選択中
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        {templates.length > 0 && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
              {selectedTemplateId
                ? `${templates.find((t) => t.id === selectedTemplateId)?.name} を選択中`
                : 'テンプレートを選択してください'}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedTemplateId}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedTemplateId ? '#8B5CF6' : '#D1D5DB',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: selectedTemplateId ? 'pointer' : 'not-allowed',
                  opacity: selectedTemplateId ? 1 : 0.6,
                }}
              >
                このテンプレートを使用
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 拡大プレビューモーダル */}
      {expandedTemplateId && (() => {
        const expandedTemplate = templates.find(t => t.id === expandedTemplateId);
        if (!expandedTemplate) return null;

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
            }}
            onClick={() => setExpandedTemplateId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setExpandedTemplateId(null);
              }
            }}
            tabIndex={0}
          >
            {/* ヘッダー */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                color: '#fff',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  {expandedTemplate.name}
                </h3>
                {expandedTemplate.description && (
                  <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.8 }}>
                    {expandedTemplate.description}
                  </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>
                  元のページ: {expandedTemplate.pageTitle}
                </p>
              </div>
              <button
                onClick={() => setExpandedTemplateId(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                閉じる (ESC)
              </button>
            </div>

            {/* 拡大プレビューコンテンツ */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '1200px',
                  margin: '0 auto',
                }}
              >
                <DynamicPage
                  pageId={expandedTemplate.pageId}
                  pageNumber={1}
                  title={expandedTemplate.pageTitle}
                  content={expandedTemplate.pageContent}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

