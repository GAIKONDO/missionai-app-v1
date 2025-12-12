'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import dynamic from 'next/dynamic';
import MermaidLoader from './MermaidLoader';

// VegaChartを動的インポート（SSRを回避、loading状態も処理）
const VegaChart = dynamic(() => import('./VegaChart'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      color: 'var(--color-text-light)',
      border: '1px solid var(--color-border-color)',
      borderRadius: '6px',
      backgroundColor: '#fff',
    }}>
      グラフを読み込み中...
    </div>
  ),
});

// ThreeSceneを動的インポート（SSRを回避）
const ThreeScene = dynamic(() => import('./ThreeScene'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      color: 'var(--color-text-light)',
      border: '1px solid var(--color-border-color)',
      borderRadius: '6px',
      backgroundColor: '#fff',
    }}>
      3Dシーンを読み込み中...
    </div>
  ),
});

// TypographyArtを動的インポート（SSRを回避）
const TypographyArt = dynamic(() => import('./TypographyArt'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      color: 'var(--color-text-light)',
      border: '1px solid var(--color-border-color)',
      borderRadius: '6px',
      backgroundColor: '#fff',
    }}>
      タイポグラフィアートを読み込み中...
    </div>
  ),
});

// Mermaid図の簡易レンダリングコンポーネント
function MermaidDiagram({ 
  mermaidCode, 
  diagramId 
}: { 
  mermaidCode: string; 
  diagramId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const renderedRef = useRef(false);

  // Mermaidの読み込み状態をチェック
  useEffect(() => {
    const checkMermaid = () => {
      if (typeof window !== 'undefined' && (window as any).mermaid) {
        const mermaid = (window as any).mermaid;
        if (typeof mermaid.initialize === 'function') {
          mermaid.initialize({ 
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontSize: 18,
            fontFamily: 'inherit',
          });
        }
        if (!mermaidLoaded) {
          setMermaidLoaded(true);
        }
        return true;
      }
      return false;
    };

    const handleMermaidLoaded = () => {
      if (checkMermaid()) {
        setMermaidLoaded(true);
      }
    };

    if (checkMermaid()) {
      setMermaidLoaded(true);
    } else {
      if (typeof window !== 'undefined') {
        window.addEventListener('mermaidloaded', handleMermaidLoaded);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mermaidloaded', handleMermaidLoaded);
      }
    };
  }, [mermaidLoaded]);

  // Mermaid図のレンダリング
  useEffect(() => {
    if (!mermaidLoaded || !containerRef.current) return;

    const renderDiagram = async () => {
      // Mermaidが利用可能になるまで待つ
      let retries = 0;
      const maxRetries = 50;
      while (retries < maxRetries && (!(window as any).mermaid || typeof (window as any).mermaid.run !== 'function')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      const mermaid = (window as any).mermaid;
      if (!mermaid || typeof mermaid.run !== 'function') {
        console.warn('Mermaidが利用できません');
        return;
      }

      try {
        // 既にレンダリング済みの場合はスキップ
        if (renderedRef.current) return;
        
        // コンテナがDOMに存在することを確認
        if (!containerRef.current) return;

        // Mermaid図をレンダリング
        await mermaid.run({
          nodes: [containerRef.current],
        });
        
        renderedRef.current = true;
      } catch (error) {
        console.error('Mermaid図のレンダリングエラー:', error);
        renderedRef.current = false;
      }
    };

    // レンダリング済みフラグをリセット（新しい図の場合）
    renderedRef.current = false;
    renderDiagram();
  }, [mermaidLoaded, mermaidCode, diagramId]);

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        ref={containerRef}
        className="mermaid"
        data-diagram-id={diagramId}
        style={{
          padding: '16px',
          backgroundColor: '#fff',
          border: '1px solid var(--color-border-color)',
          borderRadius: '6px',
          overflow: 'auto',
        }}
      >
        {mermaidCode}
      </div>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// コードブロックの言語とタイトルを抽出
function parseCodeBlockInfo(className?: string): { language: string; title?: string } {
  if (!className) {
    return { language: '' };
  }

  // classNameは "language-javascript:アート" のような形式
  const match = className.match(/^language-(.+)$/);
  if (!match) {
    return { language: '' };
  }

  const langAndTitle = match[1];
  
  // タイトル区切り文字をチェック（: または — または /）
  const titleMatch = langAndTitle.match(/^(.+?)[:：—/](.+)$/);
  if (titleMatch) {
    return {
      language: titleMatch[1].trim(),
      title: titleMatch[2].trim(),
    };
  }

  return { language: langAndTitle };
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Mermaid図のIDを生成するためのカウンター
  const mermaidCounterRef = useRef(0);

  return (
    <>
      <MermaidLoader
        config={{
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        }}
      />
      <div className={`markdown-content ${className || ''}`} style={{ 
        fontSize: '14px',
        lineHeight: '1.8',
        color: 'var(--color-text)',
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const { language, title } = parseCodeBlockInfo(className);
              const codeContent = String(children).replace(/\n$/, '');
              
              // Mermaidのコードブロックの場合
              if (!inline && language === 'mermaid') {
                mermaidCounterRef.current += 1;
                const diagramId = `mermaid-diagram-${Date.now()}-${mermaidCounterRef.current}`;
                return (
                  <div style={{ marginBottom: '24px' }}>
                    {title && (
                      <div style={{
                        background: 'rgba(31, 41, 51, 0.05)',
                        border: '1px solid var(--color-border-color)',
                        borderBottom: 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text-light)',
                      }}>
                        {title}
                      </div>
                    )}
                    <div style={{
                      border: '1px solid var(--color-border-color)',
                      borderRadius: title ? '0 0 6px 6px' : '6px',
                    }}>
                      <MermaidDiagram
                        mermaidCode={codeContent}
                        diagramId={diagramId}
                      />
                    </div>
                  </div>
                );
              }
              
              // VegaまたはVega-Liteのコードブロックの場合
              if (!inline && (language === 'vega' || language === 'vega-lite')) {
              try {
                const spec = JSON.parse(codeContent);
                return (
                  <div data-vega-chart>
                    <VegaChart
                      spec={spec}
                      language={language as 'vega' | 'vega-lite'}
                      title={title}
                    />
                  </div>
                );
              } catch (error) {
                // JSONパースエラーの場合は通常のコードブロックとして表示
                return (
                  <div style={{ marginBottom: '24px' }}>
                    {title && (
                      <div style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid #dc3545',
                        borderBottom: 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#dc3545',
                      }}>
                        {title} (JSONパースエラー)
                      </div>
                    )}
                    <div style={{
                      padding: '16px',
                      border: '1px solid #dc3545',
                      borderRadius: title ? '0 0 6px 6px' : '6px',
                      backgroundColor: 'rgba(220, 53, 69, 0.05)',
                      color: '#dc3545',
                      fontSize: '13px',
                    }}>
                      <strong>エラー:</strong> JSON形式が正しくありません。<br/>
                      <code style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                        {codeContent.substring(0, 200)}...
                      </code>
                    </div>
                  </div>
                );
              }
            }

            // タイポグラフィアートのコードブロックの場合
            if (!inline && (language === 'typography' || language === 'typography-art')) {
              try {
                const config = JSON.parse(codeContent);
                return (
                  <div style={{ marginBottom: '24px' }}>
                    {title && (
                      <div style={{
                        background: 'rgba(31, 41, 51, 0.05)',
                        border: '1px solid var(--color-border-color)',
                        borderBottom: 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text-light)',
                      }}>
                        {title}
                      </div>
                    )}
                    <div style={{
                      border: '1px solid var(--color-border-color)',
                      borderRadius: title ? '0 0 6px 6px' : '6px',
                      padding: '16px',
                      backgroundColor: '#fff',
                    }}>
                      <TypographyArt
                        words={config.words || []}
                        width={config.width || 800}
                        height={config.height || 600}
                        backgroundColor={config.backgroundColor || '#ffffff'}
                        textColor={config.textColor || '#000000'}
                        minFontSize={config.minFontSize || 24}
                        maxFontSize={config.maxFontSize || 120}
                        rotationRange={config.rotationRange || 45}
                      />
                    </div>
                  </div>
                );
              } catch (error) {
                return (
                  <div style={{ marginBottom: '24px' }}>
                    {title && (
                      <div style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid #dc3545',
                        borderBottom: 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#dc3545',
                      }}>
                        {title} (JSONパースエラー)
                      </div>
                    )}
                    <div style={{
                      padding: '16px',
                      border: '1px solid #dc3545',
                      borderRadius: title ? '0 0 6px 6px' : '6px',
                      backgroundColor: 'rgba(220, 53, 69, 0.05)',
                      color: '#dc3545',
                      fontSize: '13px',
                    }}>
                      <strong>エラー:</strong> JSON形式が正しくありません。<br/>
                      <code style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                        {codeContent.substring(0, 200)}...
                      </code>
                    </div>
                  </div>
                );
              }
            }

            // Three.jsまたはGLSLのコードブロックの場合
            if (!inline && (language === 'three' || language === 'three.js' || language === 'glsl')) {
              try {
                const config = JSON.parse(codeContent);
                return (
                  <ThreeScene
                    config={config}
                    title={title}
                  />
                );
              } catch (error) {
                // JSONパースエラーの場合は通常のコードブロックとして表示
                return (
                  <div style={{ marginBottom: '24px' }}>
                    {title && (
                      <div style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid #dc3545',
                        borderBottom: 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#dc3545',
                      }}>
                        {title} (JSONパースエラー)
                      </div>
                    )}
                    <div style={{
                      padding: '16px',
                      border: '1px solid #dc3545',
                      borderRadius: title ? '0 0 6px 6px' : '6px',
                      backgroundColor: 'rgba(220, 53, 69, 0.05)',
                      color: '#dc3545',
                      fontSize: '13px',
                    }}>
                      <strong>エラー:</strong> JSON形式が正しくありません。<br/>
                      <code style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                        {codeContent.substring(0, 200)}...
                      </code>
                    </div>
                  </div>
                );
              }
            }
            
            return !inline && match ? (
              <div style={{ marginBottom: '24px' }}>
                {title && (
                  <div style={{
                    background: 'rgba(31, 41, 51, 0.05)',
                    border: '1px solid var(--color-border-color)',
                    borderBottom: 'none',
                    borderTopLeftRadius: '6px',
                    borderTopRightRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-text-light)',
                  }}>
                    {title}
                  </div>
                )}
                <SyntaxHighlighter
                  style={oneDark}
                  language={language || match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: title ? '0 0 6px 6px' : '6px',
                    border: '1px solid var(--color-border-color)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    background: '#1e1e1e',
                  }}
                  {...props}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className={className}
                style={{
                  background: 'rgba(31, 41, 51, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontFamily: 'monospace',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
    </>
  );
}

