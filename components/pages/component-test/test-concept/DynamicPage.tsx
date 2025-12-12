'use client';

import { useRef, useMemo, useContext, createContext, useEffect } from 'react';
import './pageStyles.css';
import MermaidDiagram from './MermaidDiagram';

interface DynamicPageProps {
  pageId: string;
  pageNumber: number;
  title: string;
  content: string;
  keyMessage?: string;
  subMessage?: string;
}

interface ContentPart {
  type: 'html' | 'mermaid';
  content: string;
  mermaidId?: string;
}

// デフォルトのコンテキスト（コンテキストが存在しない場合に使用）
const DefaultContainerVisibilityContext = createContext<{ showContainers: boolean } | undefined>(undefined);

// オプショナルなContainerVisibilityContextをモジュールレベルでインポート
let ContainerVisibilityContext: any = DefaultContainerVisibilityContext;

// テンプレートアプリでは、これらのモジュールは存在しないため、デフォルトコンテキストを使用
// 必要に応じて、後で追加できます

export default function DynamicPage({ pageId, pageNumber, title, content, keyMessage, subMessage }: DynamicPageProps) {
  // useContainerVisibilityを取得（コンテキストが存在する場合）
  // コンテキストが存在しない場合はデフォルト値を使用
  // React Hooksのルールに準拠するため、useContextを常に呼び出す
  const contextValue = useContext(ContainerVisibilityContext) as { showContainers?: boolean } | undefined;
  const showContainers = contextValue?.showContainers ?? false;
  
  const contentRef = useRef<HTMLDivElement>(null);

  // コンテンツに既にキーメッセージとサブメッセージが含まれているかチェック
  const hasKeyMessageInContent = useMemo(() => {
    if (!content || typeof window === 'undefined') return false;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const keyMessageContainer = tempDiv.querySelector('.key-message-container');
    return !!keyMessageContainer;
  }, [content]);

  // コンテンツに既にキーメッセージが含まれている場合は、propsのkeyMessage/subMessageを表示しない
  const shouldShowKeyMessage = !hasKeyMessageInContent && (keyMessage || subMessage);

  // HTMLコンテンツをパースして、Mermaid図の部分を検出
  const parsedContent = useMemo(() => {
    const parts: ContentPart[] = [];
    let lastIndex = 0;

    // Mermaid図のパターンを検索（外側のmermaid-diagram-containerも含む）
    // パターン: <div class="mermaid-diagram-container">...<div class="mermaid" data-mermaid-diagram="...">コード</div></div>
    // より柔軟なパターンで検索（改行や空白を考慮）
    const mermaidPattern = /<div\s+class=["']mermaid-diagram-container["'][^>]*>[\s\S]*?<div\s+class=["']mermaid["']\s+data-mermaid-diagram=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;

    while ((match = mermaidPattern.exec(content)) !== null) {
      // Mermaid図の前のHTMLコンテンツ
      if (match.index > lastIndex) {
        parts.push({
          type: 'html',
          content: content.substring(lastIndex, match.index),
        });
      }

      // Mermaid図のコードを抽出（HTMLタグは保持する）
      let mermaidCode = match[2];
      
      // 前後の空白行を削除
      mermaidCode = mermaidCode.trim();
      
      // HTMLエンティティをデコード（&lt; → <, &gt; → >, &amp; → &）
      // ただし、textContentを使うとHTMLタグが削除されるので、手動でデコード
      mermaidCode = mermaidCode
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      
      const mermaidId = match[1];
      
      console.log('抽出したMermaidコード（最初の200文字）:', mermaidCode.substring(0, 200));
      console.log('抽出したMermaidコード（最後の100文字）:', mermaidCode.substring(Math.max(0, mermaidCode.length - 100)));
      console.log('抽出したMermaidコード（全体の長さ）:', mermaidCode.length);

      parts.push({
        type: 'mermaid',
        content: mermaidCode,
        mermaidId: mermaidId || `mermaid-${Date.now()}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // 残りのHTMLコンテンツ
    if (lastIndex < content.length) {
      parts.push({
        type: 'html',
        content: content.substring(lastIndex),
      });
    }

    // Mermaid図が見つからない場合は、全体をHTMLとして扱う
    if (parts.length === 0) {
      parts.push({
        type: 'html',
        content: content,
      });
    }

    console.log('パース結果:', {
      totalParts: parts.length,
      mermaidParts: parts.filter(p => p.type === 'mermaid').length,
      htmlParts: parts.filter(p => p.type === 'html').length,
    });

    return parts;
  }, [content]);

  // ホバーエフェクト用のイベントリスナーを動的に適用（イベントデリゲーションを使用）
  useEffect(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;
    let hoveredElement: HTMLElement | null = null;

    // mouseover/mouseoutを使用（バブリングする）
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // アイコンコンテナのホバーエフェクト
      const iconContainer = target.closest('.challenge-icon-container') as HTMLElement;
      if (iconContainer && hoveredElement !== iconContainer) {
        hoveredElement = iconContainer;
        const computedStyle = window.getComputedStyle(iconContainer);
        const originalBgColor = computedStyle.backgroundColor;
        const originalTransform = computedStyle.transform;
        
        iconContainer.style.transition = 'transform 0.2s ease, background-color 0.2s ease';
        iconContainer.style.cursor = 'pointer';
        iconContainer.style.transform = 'scale(1.1)';
        iconContainer.style.backgroundColor = '#0066CC';
        
        // 元の値を保存
        (iconContainer as any)._originalBgColor = originalBgColor;
        (iconContainer as any)._originalTransform = originalTransform;
        return;
      }

      // アイコン全体のコンテナ（アイコン+テキスト）のホバーエフェクト
      const challengeItem = target.closest('.challenge-item') as HTMLElement;
      if (challengeItem && hoveredElement !== challengeItem) {
        hoveredElement = challengeItem;
        const computedStyle = window.getComputedStyle(challengeItem);
        const originalTransform = computedStyle.transform;
        
        challengeItem.style.transition = 'transform 0.2s ease';
        challengeItem.style.cursor = 'pointer';
        challengeItem.style.transform = 'translateY(-4px)';
        
        // 元の値を保存
        (challengeItem as any)._originalTransform = originalTransform;
        return;
      }

      // 理由カードのホバーエフェクト
      const reasonCard = target.closest('.reason-card') as HTMLElement;
      if (reasonCard && hoveredElement !== reasonCard) {
        hoveredElement = reasonCard;
        const computedStyle = window.getComputedStyle(reasonCard);
        const originalTransform = computedStyle.transform;
        const originalBoxShadow = computedStyle.boxShadow;
        const originalBorderColor = computedStyle.borderColor;
        
        reasonCard.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease';
        reasonCard.style.cursor = 'pointer';
        reasonCard.style.transform = 'translateY(-4px)';
        reasonCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        // CSS変数を解決
        const root = document.documentElement;
        const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary').trim() || '#1F2933';
        reasonCard.style.borderColor = primaryColor;
        
        // 元の値を保存
        (reasonCard as any)._originalTransform = originalTransform;
        (reasonCard as any)._originalBoxShadow = originalBoxShadow;
        (reasonCard as any)._originalBorderColor = originalBorderColor;
        return;
      }

      // 不安カードのホバーエフェクト
      const anxietyCard = target.closest('.anxiety-card') as HTMLElement;
      if (anxietyCard && hoveredElement !== anxietyCard) {
        hoveredElement = anxietyCard;
        const computedStyle = window.getComputedStyle(anxietyCard);
        const originalTransform = computedStyle.transform || 'none';
        const originalBoxShadow = computedStyle.boxShadow || 'none';
        
        anxietyCard.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        anxietyCard.style.cursor = 'pointer';
        anxietyCard.style.transform = 'translateY(-4px)';
        anxietyCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
        
        // 元の値を保存
        (anxietyCard as any)._originalTransform = originalTransform;
        (anxietyCard as any)._originalBoxShadow = originalBoxShadow;
        return;
      }

      // 解決策カードのホバーエフェクト
      const solutionCard = target.closest('.solution-card') as HTMLElement;
      if (solutionCard && hoveredElement !== solutionCard) {
        hoveredElement = solutionCard;
        const computedStyle = window.getComputedStyle(solutionCard);
        const originalTransform = computedStyle.transform || 'none';
        const originalBackgroundColor = computedStyle.backgroundColor || '';
        
        solutionCard.style.transition = 'transform 0.2s ease, background-color 0.2s ease';
        solutionCard.style.cursor = 'pointer';
        solutionCard.style.transform = 'translateY(-4px)';
        solutionCard.style.backgroundColor = '#F3F4F6';
        solutionCard.style.padding = '16px';
        solutionCard.style.borderRadius = '8px';
        
        // 元の値を保存
        (solutionCard as any)._originalTransform = originalTransform;
        (solutionCard as any)._originalBackgroundColor = originalBackgroundColor;
        (solutionCard as any)._originalPadding = computedStyle.padding || '';
        (solutionCard as any)._originalBorderRadius = computedStyle.borderRadius || '';
        return;
      }

      // AIネイティブカードのホバーエフェクト
      const aiNativeCard = target.closest('.ai-native-card') as HTMLElement;
      if (aiNativeCard && hoveredElement !== aiNativeCard) {
        hoveredElement = aiNativeCard;
        const computedStyle = window.getComputedStyle(aiNativeCard);
        const originalTransform = computedStyle.transform || 'none';
        const originalBoxShadow = computedStyle.boxShadow || 'none';
        const originalBorderColor = computedStyle.borderColor || '';
        
        aiNativeCard.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease';
        aiNativeCard.style.cursor = 'pointer';
        aiNativeCard.style.transform = 'translateY(-4px)';
        aiNativeCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        // CSS変数を解決
        const root = document.documentElement;
        const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary').trim() || '#1F2933';
        aiNativeCard.style.borderColor = primaryColor;
        
        // 元の値を保存
        (aiNativeCard as any)._originalTransform = originalTransform;
        (aiNativeCard as any)._originalBoxShadow = originalBoxShadow;
        (aiNativeCard as any)._originalBorderColor = originalBorderColor;
        return;
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // アイコンコンテナのホバーエフェクト解除
      const iconContainer = target.closest('.challenge-icon-container') as HTMLElement;
      if (iconContainer && !iconContainer.contains(relatedTarget) && (iconContainer as any)._originalBgColor) {
        iconContainer.style.transform = (iconContainer as any)._originalTransform || '';
        iconContainer.style.backgroundColor = (iconContainer as any)._originalBgColor || '';
        hoveredElement = null;
        return;
      }

      // アイコン全体のコンテナのホバーエフェクト解除
      const challengeItem = target.closest('.challenge-item') as HTMLElement;
      if (challengeItem && !challengeItem.contains(relatedTarget) && (challengeItem as any)._originalTransform !== undefined) {
        challengeItem.style.transform = (challengeItem as any)._originalTransform || '';
        hoveredElement = null;
        return;
      }

      // 理由カードのホバーエフェクト解除
      const reasonCard = target.closest('.reason-card') as HTMLElement;
      if (reasonCard && !reasonCard.contains(relatedTarget) && (reasonCard as any)._originalTransform !== undefined) {
        reasonCard.style.transform = (reasonCard as any)._originalTransform || '';
        reasonCard.style.boxShadow = (reasonCard as any)._originalBoxShadow || '';
        reasonCard.style.borderColor = (reasonCard as any)._originalBorderColor || '';
        hoveredElement = null;
        return;
      }

      // 不安カードのホバーエフェクト解除
      const anxietyCard = target.closest('.anxiety-card') as HTMLElement;
      if (anxietyCard) {
        // relatedTargetがanxietyCard内にない場合、またはrelatedTargetがnullの場合
        if (!anxietyCard.contains(relatedTarget) && (anxietyCard as any)._originalTransform !== undefined) {
          const originalTransform = (anxietyCard as any)._originalTransform || 'none';
          const originalBoxShadow = (anxietyCard as any)._originalBoxShadow || 'none';
          anxietyCard.style.transform = originalTransform === 'none' ? '' : originalTransform;
          anxietyCard.style.boxShadow = originalBoxShadow === 'none' ? '' : originalBoxShadow;
          hoveredElement = null;
          return;
        }
      }

      // 解決策カードのホバーエフェクト解除
      const solutionCard = target.closest('.solution-card') as HTMLElement;
      if (solutionCard) {
        if (!solutionCard.contains(relatedTarget) && (solutionCard as any)._originalTransform !== undefined) {
          const originalTransform = (solutionCard as any)._originalTransform || 'none';
          solutionCard.style.transform = originalTransform === 'none' ? '' : originalTransform;
          solutionCard.style.backgroundColor = (solutionCard as any)._originalBackgroundColor || '';
          solutionCard.style.padding = (solutionCard as any)._originalPadding || '';
          solutionCard.style.borderRadius = (solutionCard as any)._originalBorderRadius || '';
          hoveredElement = null;
          return;
        }
      }

      // AIネイティブカードのホバーエフェクト解除
      const aiNativeCard = target.closest('.ai-native-card') as HTMLElement;
      if (aiNativeCard) {
        if (!aiNativeCard.contains(relatedTarget) && (aiNativeCard as any)._originalTransform !== undefined) {
          const originalTransform = (aiNativeCard as any)._originalTransform || 'none';
          const originalBoxShadow = (aiNativeCard as any)._originalBoxShadow || 'none';
          const originalBorderColor = (aiNativeCard as any)._originalBorderColor || '';
          aiNativeCard.style.transform = originalTransform === 'none' ? '' : originalTransform;
          aiNativeCard.style.boxShadow = originalBoxShadow === 'none' ? '' : originalBoxShadow;
          aiNativeCard.style.borderColor = originalBorderColor;
          hoveredElement = null;
          return;
        }
      }
    };

    // 親要素にイベントリスナーを追加（イベントデリゲーション）
    container.addEventListener('mouseover', handleMouseOver, true);
    container.addEventListener('mouseout', handleMouseOut, true);

    // クリーンアップ
    return () => {
      container.removeEventListener('mouseover', handleMouseOver, true);
      container.removeEventListener('mouseout', handleMouseOut, true);
    };
  }, [content]);



  return (
    <div
      data-page-container={pageNumber.toString()}
      className="page-content"
      style={{
        marginBottom: '40px',
        ...(showContainers ? {
          border: '4px dashed #000000',
          borderRadius: '8px',
          padding: '16px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          backgroundColor: 'transparent',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
        } : {}),
      }}
    >
      {/* ページタイトルを常に表示（固定形式と同じスタイル、PDF出力時に左上に配置される） */}
      {title && (
        <h3 
          data-pdf-title-h3="true"
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            borderLeft: '3px solid var(--color-primary)',
            paddingLeft: '8px',
            margin: 0,
            marginBottom: '16px',
          }}
        >
          {title}
        </h3>
      )}
      {/* キーメッセージとサブメッセージを表示（コンテンツに含まれていない場合のみ） */}
      {shouldShowKeyMessage && (
        <div className="key-message-container" style={{ 
          marginBottom: '40px'
        }}>
          {keyMessage && (
            <h2 className="key-message-title">
              {keyMessage}
            </h2>
          )}
          {subMessage && (
            <p className="key-message-subtitle gradient-text-blue">
              {subMessage}
            </p>
          )}
        </div>
      )}
      {/* スライドマスタースタイルを適用：共通デザインクラスを使用 */}
      <div 
        ref={contentRef}
        className="page-section-content"
      >
        {parsedContent.map((part, index) => {
          if (part.type === 'mermaid') {
            return (
              <div key={`mermaid-wrapper-${part.mermaidId}-${index}`} style={{ paddingLeft: '11px' }}>
                <MermaidDiagram
                  diagramCode={part.content}
                  diagramId={part.mermaidId || `mermaid-${pageId}-${index}`}
                  centerNodeFontSize={24}
                  childNodeFontSize={14}
                />
              </div>
            );
          } else {
            return (
              <div
                key={`html-${index}`}
                dangerouslySetInnerHTML={{ __html: part.content }}
              />
            );
          }
        })}
      </div>
    </div>
  );
}

