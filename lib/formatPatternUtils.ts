/**
 * フォーマットパターン記録ユーティリティ
 * ページのフォーマットパターンを検出・記録するための関数群
 */

import { FormatPattern } from '@/types/pageMetadata';

/**
 * レイアウトタイプを検出
 */
export function detectLayoutType(content: string): 'single-column' | 'two-column' | 'grid' | 'mixed' {
  // 2カラムレイアウトの検出
  if (content.includes('two-column') || content.includes('column-2') || content.includes('grid-2')) {
    return 'two-column';
  }

  // グリッドレイアウトの検出
  if (content.includes('grid') || content.includes('grid-container')) {
    return 'grid';
  }

  // 複合レイアウトの検出
  const hasMultipleLayouts = [
    content.includes('two-column'),
    content.includes('grid'),
    content.includes('flex'),
  ].filter(Boolean).length > 1;

  if (hasMultipleLayouts) {
    return 'mixed';
  }

  return 'single-column';
}

/**
 * スタイルパターンを検出
 */
export function detectStylePattern(content: string): {
  hasKeyMessage?: boolean;
  hasCards?: boolean;
  colorScheme?: string;
  visualElements?: string[];
} {
  const visualElements: string[] = [];

  // キーメッセージの検出
  const hasKeyMessage = 
    content.includes('key-message') ||
    content.includes('keyMessage') ||
    content.includes('main-message') ||
    content.includes('highlight');

  // カードレイアウトの検出
  const hasCards = 
    content.includes('card') ||
    content.includes('card-container') ||
    content.includes('card-item');

  // カラースキームの検出（簡易版）
  let colorScheme: string | undefined;
  if (content.includes('primary-color') || content.includes('primary')) {
    colorScheme = 'primary';
  } else if (content.includes('secondary-color') || content.includes('secondary')) {
    colorScheme = 'secondary';
  } else if (content.includes('accent-color') || content.includes('accent')) {
    colorScheme = 'accent';
  }

  // 視覚要素の検出
  if (content.includes('mermaid') || content.includes('diagram')) {
    visualElements.push('diagram');
  }
  if (content.includes('<img') || content.includes('image')) {
    visualElements.push('image');
  }
  if (content.includes('<table') || content.includes('table')) {
    visualElements.push('table');
  }
  if (content.includes('chart') || content.includes('graph')) {
    visualElements.push('chart');
  }

  return {
    hasKeyMessage: hasKeyMessage || undefined,
    hasCards: hasCards || undefined,
    colorScheme,
    visualElements: visualElements.length > 0 ? visualElements : undefined,
  };
}

/**
 * コンテンツパターンを検出
 */
export function detectContentPattern(content: string, title: string): {
  structure?: 'narrative' | 'list-based' | 'comparison' | 'process-flow';
  hasIntroduction?: boolean;
  hasConclusion?: boolean;
  hasCallToAction?: boolean;
} {
  const textContent = content.toLowerCase();
  const titleLower = title.toLowerCase();

  // 構造タイプの検出
  let structure: 'narrative' | 'list-based' | 'comparison' | 'process-flow' | undefined;

  // リストベースの検出
  const listCount = (content.match(/<ul|<ol|<li/g) || []).length;
  if (listCount > 5) {
    structure = 'list-based';
  }

  // 比較タイプの検出
  if (
    textContent.includes('比較') ||
    textContent.includes('vs') ||
    textContent.includes('対比') ||
    textContent.includes('versus') ||
    titleLower.includes('比較')
  ) {
    structure = 'comparison';
  }

  // プロセスフローの検出
  if (
    textContent.includes('プロセス') ||
    textContent.includes('フロー') ||
    textContent.includes('手順') ||
    textContent.includes('ステップ') ||
    content.includes('mermaid') && (textContent.includes('flow') || textContent.includes('graph'))
  ) {
    structure = 'process-flow';
  }

  // ナラティブ（物語形式）の検出
  if (!structure) {
    const paragraphCount = (content.match(/<p[^>]*>/g) || []).length;
    if (paragraphCount > 3) {
      structure = 'narrative';
    }
  }

  // 導入部分の検出
  const hasIntroduction =
    textContent.includes('はじめに') ||
    textContent.includes('導入') ||
    textContent.includes('イントロ') ||
    textContent.includes('overview') ||
    titleLower.includes('概要') ||
    titleLower.includes('はじめに');

  // 結論部分の検出
  const hasConclusion =
    textContent.includes('まとめ') ||
    textContent.includes('結論') ||
    textContent.includes('まとめ') ||
    textContent.includes('conclusion') ||
    titleLower.includes('まとめ') ||
    titleLower.includes('結論');

  // コールトゥアクションの検出
  const hasCallToAction =
    textContent.includes('お問い合わせ') ||
    textContent.includes('ご相談') ||
    textContent.includes('contact') ||
    textContent.includes('call to action') ||
    content.includes('cta') ||
    content.includes('button') && (textContent.includes('click') || textContent.includes('click'));

  return {
    structure,
    hasIntroduction: hasIntroduction || undefined,
    hasConclusion: hasConclusion || undefined,
    hasCallToAction: hasCallToAction || undefined,
  };
}

/**
 * フォーマットパターンを解析
 */
export function analyzeFormatPattern(
  pageId: string,
  content: string,
  title: string
): FormatPattern {
  const layoutType = detectLayoutType(content);
  const stylePattern = detectStylePattern(content);
  const contentPattern = detectContentPattern(content, title);

  return {
    layoutType,
    stylePattern: Object.keys(stylePattern).length > 0 ? stylePattern : undefined,
    contentPattern: Object.keys(contentPattern).length > 0 ? contentPattern : undefined,
  };
}

