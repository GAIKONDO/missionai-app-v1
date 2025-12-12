'use client';

import { useState, useEffect, useRef } from 'react';

interface PageBreakEditorProps {
  planId: string;
  currentSubMenu: string;
  pageBreakIds: string[];
  onSave: (ids: string[]) => void;
}

export default function PageBreakEditor({
  planId,
  currentSubMenu,
  pageBreakIds,
  onSave,
}: PageBreakEditorProps) {
  interface ElementItem {
    id: string;
    label: string;
    element: HTMLElement;
    level?: number; // 階層レベル（0: カード外, 1: カード, 2: カード内見出し）
    cardId?: string; // 所属するカードのID
    cardTitle?: string; // 所属するカードのタイトル
  }

  const [isOpen, setIsOpen] = useState(false);
  const [showAllSettings, setShowAllSettings] = useState(false);
  const [availableIds, setAvailableIds] = useState<ElementItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(pageBreakIds);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 現在の設定があるかどうかを確認
  const hasExistingSettings = pageBreakIds.length > 0;

  // 利用可能なIDを検出
  useEffect(() => {
    if (!isOpen) return;

    // プレゼンテーションモードと通常表示の両方に対応
    let container = document.querySelector('[data-content-container]') as HTMLElement;
    if (!container) {
      // 通常表示時は、.card要素を含む親要素を探す
      const cards = document.querySelectorAll('.card');
      if (cards.length > 0) {
        // 最初の.card要素の親要素を取得
        const firstCard = cards[0] as HTMLElement;
        container = firstCard.parentElement as HTMLElement;
      }
    }
    if (!container) return;

    // 構造化された要素リストを作成
    interface ElementItem {
      id: string;
      label: string;
      element: HTMLElement;
      level?: number; // 階層レベル（0: カード外, 1: カード, 2: カード内見出し）
      cardId?: string; // 所属するカードのID
      cardTitle?: string; // 所属するカードのタイトル
    }
    
    const elementsWithId: ElementItem[] = [];
    const addedIds = new Set<string>(); // 重複を防ぐ
    const cardMap = new Map<HTMLElement, { id: string; title: string; headings: ElementItem[] }>(); // カードごとの見出しを管理
    
    // h2, h3, h4, h5, h6を検索（カード外の見出し）
    const headings = container.querySelectorAll('h2[id], h3[id], h4[id], h5[id], h6[id]');
    headings.forEach(heading => {
      if (heading instanceof HTMLElement && heading.id) {
        // カード内の見出しは後で処理するのでスキップ
        if (heading.closest('.card')) return;
        
        const text = heading.textContent?.trim() || heading.id;
        elementsWithId.push({
          id: heading.id,
          label: `${heading.tagName.toLowerCase()}: ${text.substring(0, 50)}`,
          element: heading,
          level: 0,
        });
        addedIds.add(heading.id);
      }
    });

    // .card要素を検索して構造化
    const cards = container.querySelectorAll('.card');
    cards.forEach(card => {
      if (card instanceof HTMLElement) {
        const cardTitle = card.querySelector('h3, h4')?.textContent?.trim() || 'カード';
        const cardId = card.id || `card-${cardTitle.substring(0, 20)}`;
        
        const cardHeadings: ElementItem[] = [];
        
        // カード自体にIDがある場合
        if (card.id && !addedIds.has(card.id)) {
          elementsWithId.push({
            id: card.id,
            label: `カード: ${cardTitle.substring(0, 50)}`,
            element: card,
            level: 1,
          });
          addedIds.add(card.id);
        }
        
        // カード内の見出し要素（h3, h4, h5, h6）を検索
        const headingsInCard = card.querySelectorAll('h3[id], h4[id], h5[id], h6[id]');
        headingsInCard.forEach(heading => {
          if (heading instanceof HTMLElement && heading.id && !addedIds.has(heading.id)) {
            const text = heading.textContent?.trim() || heading.id;
            const tagName = heading.tagName.toLowerCase();
            cardHeadings.push({
              id: heading.id,
              label: `${tagName}: ${text.substring(0, 50)}`,
              element: heading,
              level: 2,
              cardId: cardId,
              cardTitle: cardTitle,
            });
            addedIds.add(heading.id);
          }
        });
        
        // カード内の見出し要素でIDがないものも検索（自動ID付与の候補）
        const cardHeadingsWithoutId = card.querySelectorAll('h3:not([id]), h4:not([id]), h5:not([id]), h6:not([id])');
        cardHeadingsWithoutId.forEach(heading => {
          if (heading instanceof HTMLElement) {
            const text = heading.textContent?.trim();
            if (text && text.length > 0) {
              // 一時的なIDを生成して候補として表示（実際には自動検出時に付与される）
              const tempId = `temp-${heading.tagName.toLowerCase()}-${text.substring(0, 20).replace(/\s+/g, '-')}`;
              if (!addedIds.has(tempId)) {
                const tagName = heading.tagName.toLowerCase();
                cardHeadings.push({
                  id: tempId,
                  label: `${tagName}: ${text.substring(0, 50)} (ID未設定)`,
                  element: heading,
                  level: 2,
                  cardId: cardId,
                  cardTitle: cardTitle,
                });
                addedIds.add(tempId);
              }
            }
          }
        });
        
        // カードとその見出しをマップに保存
        if (cardHeadings.length > 0 || (card.id && !addedIds.has(card.id))) {
          cardMap.set(card, { id: cardId, title: cardTitle, headings: cardHeadings });
        }
      }
    });
    
    // カードとその見出しを順番に追加（構造化）
    cardMap.forEach((cardInfo, card) => {
      // カード自体を追加（まだ追加されていない場合）
      if (card.id && !addedIds.has(card.id)) {
        elementsWithId.push({
          id: card.id,
          label: `カード: ${cardInfo.title.substring(0, 50)}`,
          element: card,
          level: 1,
        });
        addedIds.add(card.id);
      }
      
      // カード内の見出しを追加
      cardInfo.headings.forEach(heading => {
        elementsWithId.push(heading);
      });
    });

    // IDがない要素に自動的にIDを付与（オプション）
    // ここでは、IDを持つ要素のみを使用

    setAvailableIds(elementsWithId);
    setSelectedIds(pageBreakIds);
  }, [isOpen, pageBreakIds]);

  // 自動分割位置を計算して提案
  const calculateAutoBreaks = () => {
    // プレゼンテーションモードと通常表示の両方に対応
    let container = document.querySelector('[data-content-container]') as HTMLElement;
    if (!container) {
      // 通常表示時は、.card要素を含む親要素を探す
      const cards = document.querySelectorAll('.card');
      if (cards.length > 0) {
        // 最初の.card要素の親要素を取得
        const firstCard = cards[0] as HTMLElement;
        container = firstCard.parentElement as HTMLElement;
      }
    }
    if (!container) {
      console.warn('コンテナ要素が見つかりません');
      return [];
    }

    const viewportHeight = window.innerHeight;
    const headerHeight = 80;
    const footerHeight = 60;
    const padding = 80;
    const pageHeight = viewportHeight - headerHeight - footerHeight - padding;

    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;
    const children = Array.from(container.children) as HTMLElement[];

    if (children.length === 0) {
      console.warn('コンテナ内に子要素が見つかりません');
      return [];
    }

    const breakIds: string[] = [];
    let currentPageHeight = 0;
    let autoIdCounter = 1;

    children.forEach((child, index) => {
      // IDがない要素には自動的にIDを付与
      if (!child.id) {
        // 要素の種類に応じて適切なIDを生成
        const tagName = child.tagName.toLowerCase();
        const className = typeof child.className === 'string' ? child.className : '';
        
        // h2, h3, h4などの見出し要素
        if (tagName.match(/^h[1-6]$/)) {
          const text = child.textContent?.trim() || '';
          if (text) {
            // テキストからIDを生成（日本語対応）
            const idText = text.substring(0, 30).replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '-').replace(/-+/g, '-');
            child.id = `auto-heading-${idText || autoIdCounter++}`;
          } else {
            child.id = `auto-heading-${autoIdCounter++}`;
          }
        }
        // .cardクラスを持つ要素
        else if (className.includes('card')) {
          const cardTitle = child.querySelector('h3, h4')?.textContent?.trim() || '';
          if (cardTitle) {
            const idText = cardTitle.substring(0, 30).replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '-').replace(/-+/g, '-');
            child.id = `auto-card-${idText || autoIdCounter++}`;
          } else {
            child.id = `auto-card-${autoIdCounter++}`;
          }
        }
        // その他の要素
        else {
          child.id = `auto-element-${autoIdCounter++}`;
        }
      }
      
      // カード内の見出し要素にもIDを付与
      if (child.classList.contains('card')) {
        const cardHeadings = child.querySelectorAll('h3:not([id]), h4:not([id]), h5:not([id]), h6:not([id])');
        cardHeadings.forEach(heading => {
          if (heading instanceof HTMLElement && !heading.id) {
            const text = heading.textContent?.trim() || '';
            if (text) {
              const idText = text.substring(0, 30).replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '-').replace(/-+/g, '-');
              heading.id = `auto-card-heading-${idText || autoIdCounter++}`;
            } else {
              heading.id = `auto-card-heading-${autoIdCounter++}`;
            }
          }
        });
      }

      const childRect = child.getBoundingClientRect();
      const childTop = childRect.top + window.scrollY;
      const childHeight = childRect.height;
      const relativeTop = childTop - containerTop;

      if (index === 0) {
        currentPageHeight = relativeTop + childHeight;
      } else {
        if (relativeTop + childHeight > currentPageHeight + pageHeight) {
          // この要素の前に分割が必要
          // 前の要素のIDを使用
          const prevElement = children[index - 1];
          if (prevElement.id) {
            breakIds.push(prevElement.id);
          }
          currentPageHeight = relativeTop + childHeight;
        } else {
          currentPageHeight = Math.max(currentPageHeight, relativeTop + childHeight);
        }
      }
      
      // カード内の見出し要素も分割候補として検討
      if (child.classList.contains('card')) {
        const cardHeadings = child.querySelectorAll('h3[id], h4[id], h5[id], h6[id]');
        cardHeadings.forEach(heading => {
          if (heading instanceof HTMLElement && heading.id) {
            const headingRect = heading.getBoundingClientRect();
            const headingTop = headingRect.top + window.scrollY;
            const headingHeight = headingRect.height;
            const headingRelativeTop = headingTop - containerTop;
            
            // 見出しがページ境界を超える場合は分割候補に追加
            if (headingRelativeTop + headingHeight > currentPageHeight + pageHeight) {
              // 前の見出しのIDを使用（見つからない場合はこの見出しのID）
              let foundPrev = false;
              for (let i = cardHeadings.length - 1; i >= 0; i--) {
                const prevHeading = cardHeadings[i] as HTMLElement;
                if (prevHeading === heading) continue;
                const prevRect = prevHeading.getBoundingClientRect();
                const prevTop = prevRect.top + window.scrollY;
                if (prevTop < headingTop && prevHeading.id) {
                  if (!breakIds.includes(prevHeading.id)) {
                    breakIds.push(prevHeading.id);
                  }
                  foundPrev = true;
                  break;
                }
              }
              if (!foundPrev && heading.id && !breakIds.includes(heading.id)) {
                breakIds.push(heading.id);
              }
            }
          }
        });
      }
    });

    console.log('自動検出結果:', breakIds);
    return breakIds;
  };

  const handleAutoDetect = () => {
    console.log('自動検出ボタンがクリックされました');
    const autoIds = calculateAutoBreaks();
    console.log('検出されたID:', autoIds);
    
    if (autoIds.length === 0) {
      alert('ページ分割位置が見つかりませんでした。コンテンツが1ページに収まっている可能性があります。');
      return;
    }
    
    setSelectedIds(autoIds);
    
    // 自動検出後、利用可能なIDリストを更新
    // プレゼンテーションモードと通常表示の両方に対応
    let container = document.querySelector('[data-content-container]') as HTMLElement;
    if (!container) {
      // 通常表示時は、.card要素を含む親要素を探す
      const cards = document.querySelectorAll('.card');
      if (cards.length > 0) {
        // 最初の.card要素の親要素を取得
        const firstCard = cards[0] as HTMLElement;
        container = firstCard.parentElement as HTMLElement;
      }
    }
    if (container) {
      const elementsWithId: Array<{ id: string; label: string; element: HTMLElement }> = [];
      
      // h2, h3, h4を検索
      const headings = container.querySelectorAll('h2[id], h3[id], h4[id]');
      headings.forEach(heading => {
        if (heading instanceof HTMLElement && heading.id) {
          const text = heading.textContent?.trim() || heading.id;
          elementsWithId.push({
            id: heading.id,
            label: `${heading.tagName.toLowerCase()}: ${text.substring(0, 50)}`,
            element: heading,
          });
        }
      });

      // .card要素を検索
      const cards = container.querySelectorAll('.card[id]');
      cards.forEach(card => {
        if (card instanceof HTMLElement && card.id) {
          const heading = card.querySelector('h3, h4');
          const text = heading?.textContent?.trim() || card.id;
          elementsWithId.push({
            id: card.id,
            label: `カード: ${text.substring(0, 50)}`,
            element: card,
          });
        }
      });

      // その他のIDを持つ要素も検索
      const allElements = container.querySelectorAll('[id]');
      allElements.forEach(el => {
        if (el instanceof HTMLElement && el.id && !elementsWithId.find(e => e.id === el.id)) {
          const tagName = el.tagName.toLowerCase();
          const text = el.textContent?.trim() || el.id;
          elementsWithId.push({
            id: el.id,
            label: `${tagName}: ${text.substring(0, 50)}`,
            element: el,
          });
        }
      });

      console.log('利用可能なID:', elementsWithId);
      setAvailableIds(elementsWithId);
    } else {
      console.error('コンテナ要素が見つかりません');
    }
  };

  const handleSave = () => {
    onSave(selectedIds);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (typeof window === 'undefined') return;
    const storageKey = `page-breaks-${planId}-${currentSubMenu}`;
    localStorage.removeItem(storageKey);
    setSelectedIds([]);
    onSave([]);
    setIsOpen(false);
  };

  const handleToggleId = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // すべてのプラン・サブメニューの設定を取得
  const getAllPageBreakSettings = () => {
    if (typeof window === 'undefined') return [];
    
    const allKeys = Object.keys(localStorage);
    const pageBreakKeys = allKeys.filter(key => key.startsWith('page-breaks-'));
    
    const settings: Array<{ key: string; planId: string; subMenu: string; ids: string[] }> = [];
    
    pageBreakKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const ids = JSON.parse(value);
          // キーからplanIdとsubMenuを抽出
          // 形式: page-breaks-{planId}-{subMenu}
          const match = key.match(/^page-breaks-(.+?)-(.+)$/);
          if (match) {
            settings.push({
              key,
              planId: match[1],
              subMenu: match[2],
              ids,
            });
          }
        } catch (e) {
          console.error(`設定の解析エラー: ${key}`, e);
        }
      }
    });
    
    return settings;
  };

  // 選択されたIDの要素をハイライト
  useEffect(() => {
    if (!isOpen) return;

    const container = document.querySelector('[data-content-container]') as HTMLElement;
    if (!container) return;

    // すべてのハイライトをクリア
    const allElements = container.querySelectorAll('[data-page-break-highlight]');
    allElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.removeAttribute('data-page-break-highlight');
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });

    // 選択されたIDの要素をハイライト
    selectedIds.forEach(id => {
      const element = container.querySelector(`#${id}`);
      if (element instanceof HTMLElement) {
        element.setAttribute('data-page-break-highlight', 'true');
        element.style.outline = '2px dashed var(--color-primary)';
        element.style.outlineOffset = '4px';
      }
    });

    return () => {
      // クリーンアップ
      const allElements = container.querySelectorAll('[data-page-break-highlight]');
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('data-page-break-highlight');
          el.style.outline = '';
          el.style.outlineOffset = '';
        }
      });
    };
  }, [isOpen, selectedIds]);

  return (
    <>
      {/* ページ分割設定ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {isOpen ? 'ページ分割設定を閉じる' : 'ページ分割設定'}
      </button>

      {/* ページ分割設定パネル */}
      {isOpen && (
        <div
          ref={containerRef}
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            width: '400px',
            maxHeight: '600px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid var(--color-border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              ページ分割設定
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowAllSettings(!showAllSettings)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: showAllSettings ? 'var(--color-primary)' : 'transparent',
                  color: showAllSettings ? '#fff' : 'var(--color-text)',
                  border: `1px solid ${showAllSettings ? 'var(--color-primary)' : 'var(--color-border-color)'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                全設定表示
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--color-text-light)',
                  padding: 0,
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {/* 全設定表示 */}
            {showAllSettings && (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  現在設定されているID一覧（全プラン・全サブメニュー）
                </h4>
                {getAllPageBreakSettings().length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
                    設定されているIDはありません。
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {getAllPageBreakSettings().map((setting, index) => (
                      <div key={index} style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid var(--color-border-color)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                          📄 プランID: {setting.planId} / サブメニュー: {setting.subMenu}
                        </div>
                        {setting.ids.length === 0 ? (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                            (設定なし)
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                            <div style={{ marginBottom: '4px', fontWeight: 500 }}>
                              設定されているID ({setting.ids.length}個):
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                              {setting.ids.map((id, idx) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>
                                  <code style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                                    {id}
                                  </code>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleAutoDetect}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                自動検出（現在の分割位置を提案）
              </button>
            </div>

            {availableIds.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-light)', textAlign: 'center', padding: '20px' }}>
                IDを持つ要素が見つかりませんでした。
                <br />
                ページ分割したい要素にIDを追加してください。
                <br />
                （例：id=&quot;section-1&quot;）
              </p>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '12px' }}>
                  ページ分割したい要素のIDを選択してください：
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {availableIds.map((item, index) => {
                    const { id, label, level = 0, cardTitle } = item;
                    const isCardHeading = level === 2;
                    const prevItem = index > 0 ? availableIds[index - 1] : null;
                    const isFirstInCard = isCardHeading && (!prevItem || prevItem.level !== 2 || prevItem.cardTitle !== cardTitle);
                    
                    return (
                      <div key={id}>
                        {/* カード内の最初の見出しの前にカードタイトルを表示 */}
                        {isFirstInCard && cardTitle && (
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 600, 
                            color: 'var(--color-text-light)', 
                            marginTop: '8px',
                            marginBottom: '4px',
                            paddingLeft: '8px',
                          }}>
                            📁 {cardTitle}
                          </div>
                        )}
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            paddingLeft: isCardHeading ? '32px' : '8px', // カード内見出しはインデント
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedIds.includes(id) ? 'var(--color-bg-secondary)' : 'transparent',
                            transition: 'background-color 0.2s',
                            borderLeft: isCardHeading ? '2px solid var(--color-primary)' : 'none', // カード内見出しに左ボーダー
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedIds.includes(id)) {
                              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedIds.includes(id)) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() => handleToggleId(id)}
                            style={{
                              cursor: 'pointer',
                            }}
                          />
                          <span style={{ fontSize: '13px', flex: 1 }}>{label}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--color-border-color)',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={() => {
                setSelectedIds([]);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              クリア
            </button>
            {hasExistingSettings && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                設定を削除
              </button>
            )}
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </>
  );
}

