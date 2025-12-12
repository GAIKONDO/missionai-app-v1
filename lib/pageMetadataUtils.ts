/**
 * ページメタデータのユーティリティ関数
 * AI-readableな情報を自動生成・抽出するための関数群
 */

import { PageMetadata, ContentType, SectionType, Importance } from '@/types/pageMetadata';

/**
 * HTMLタグを除去してテキストのみを抽出
 */
export function stripHtml(html: string): string {
  if (typeof window === 'undefined') {
    // サーバーサイドの場合
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * コンテンツタイプを自動判定
 */
export function detectContentType(content: string): ContentType {
  const textContent = stripHtml(content).toLowerCase();
  
  // Mermaid図の検出
  if (content.includes('mermaid') || content.includes('mermaid-diagram-container')) {
    return 'diagram';
  }
  
  // 表の検出
  if (content.includes('<table') || content.includes('<tr') || content.includes('<td')) {
    return 'table';
  }
  
  // リストの検出
  const listMatches = content.match(/<ul|<ol|<li/g);
  if (listMatches && listMatches.length > 3) {
    return 'list';
  }
  
  // 比較表の検出（特定のキーワード）
  if (textContent.includes('比較') || textContent.includes('vs') || textContent.includes('対比')) {
    return 'comparison';
  }
  
  // プロセスフローの検出
  if (textContent.includes('プロセス') || textContent.includes('フロー') || textContent.includes('手順')) {
    return 'process-flow';
  }
  
  // キービジュアルの検出
  if (content.includes('key-visual') || content.includes('keyVisual')) {
    return 'key-visual';
  }
  
  // 複合型の判定
  const hasMultipleTypes = [
    content.includes('<table'),
    content.includes('<ul') || content.includes('<ol'),
    content.includes('mermaid'),
  ].filter(Boolean).length > 1;
  
  if (hasMultipleTypes) {
    return 'mixed';
  }
  
  return 'text';
}

/**
 * キーワードを抽出（簡易版）
 * 実際の実装では、より高度なNLPライブラリを使用することを推奨
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const stopWords = new Set([
    'の', 'に', 'は', 'を', 'が', 'と', 'で', 'も', 'から', 'まで',
    'this', 'that', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
    'to', 'of', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with'
  ]);
  
  // HTMLタグを除去
  const cleanText = stripHtml(text);
  
  // 単語に分割（日本語と英語に対応）
  const words = cleanText
    .split(/[\s\u3000\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFF00-\uFFEF]+/)
    .filter(word => word.length > 1 && !stopWords.has(word.toLowerCase()));
  
  // 出現頻度をカウント
  const wordCount: { [key: string]: number } = {};
  words.forEach(word => {
    const normalized = word.toLowerCase();
    wordCount[normalized] = (wordCount[normalized] || 0) + 1;
  });
  
  // 頻度順にソート
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
  
  return sortedWords;
}

/**
 * セマンティックカテゴリを判定
 */
export function determineSemanticCategory(
  title: string,
  content: string,
  subMenuId: string
): string {
  const text = (title + ' ' + stripHtml(content)).toLowerCase();
  
  // サブメニューIDに基づく基本カテゴリ
  const subMenuCategoryMap: { [key: string]: string } = {
    'overview': 'overview',
    'business-model': 'business-model',
    'market-size': 'market-analysis',
    'features': 'product-features',
    'itochu-synergy': 'synergy',
    'plan': 'business-plan',
    'references': 'references',
    'case-study': 'case-study',
    'risk-assessment': 'risk-analysis',
    'simulation': 'simulation',
    'execution-schedule': 'execution-plan',
    'snapshot-comparison': 'comparison',
    'subsidies': 'subsidies',
    'visualizations': 'visualization',
  };
  
  const baseCategory = subMenuCategoryMap[subMenuId] || 'general';
  
  // コンテンツに基づく詳細カテゴリ
  if (text.includes('概要') || text.includes('overview') || text.includes('introduction')) {
    return `${baseCategory}-overview`;
  }
  if (text.includes('市場') || text.includes('market') || text.includes('規模')) {
    return `${baseCategory}-market`;
  }
  if (text.includes('技術') || text.includes('technology') || text.includes('feature')) {
    return `${baseCategory}-technical`;
  }
  if (text.includes('計画') || text.includes('plan') || text.includes('schedule')) {
    return `${baseCategory}-planning`;
  }
  if (text.includes('リスク') || text.includes('risk') || text.includes('課題')) {
    return `${baseCategory}-risk`;
  }
  
  return baseCategory;
}

/**
 * タグを生成
 */
export function generateTags(
  title: string,
  content: string,
  subMenuId: string
): string[] {
  const tags: string[] = [];
  const text = (title + ' ' + stripHtml(content)).toLowerCase();
  
  // サブメニューに基づくタグ
  tags.push(subMenuId);
  
  // コンテンツタイプに基づくタグ
  const contentType = detectContentType(content);
  tags.push(contentType);
  
  // キーワードから重要なものをタグとして追加
  const keywords = extractKeywords(title + ' ' + content, 5);
  tags.push(...keywords.slice(0, 3));
  
  // 特定のトピックタグ
  if (text.includes('ai') || text.includes('人工知能')) {
    tags.push('ai');
  }
  if (text.includes('ビジネス') || text.includes('business')) {
    tags.push('business');
  }
  if (text.includes('技術') || text.includes('technology')) {
    tags.push('technology');
  }
  if (text.includes('市場') || text.includes('market')) {
    tags.push('market');
  }
  if (text.includes('計画') || text.includes('plan')) {
    tags.push('planning');
  }
  
  // 重複を除去
  return Array.from(new Set(tags));
}

/**
 * セクションタイプを判定
 */
export function determineSectionType(
  pageNumber: number,
  totalPages: number,
  content: string
): SectionType {
  // 最初のページは導入
  if (pageNumber === 0) {
    return 'introduction';
  }
  
  // 最後のページは結論
  if (pageNumber === totalPages - 1) {
    return 'conclusion';
  }
  
  const text = stripHtml(content).toLowerCase();
  
  // コンテンツに基づく判定
  if (text.includes('まとめ') || text.includes('結論') || text.includes('summary') || text.includes('conclusion')) {
    return 'summary';
  }
  
  if (text.includes('付録') || text.includes('appendix') || text.includes('参考')) {
    return 'appendix';
  }
  
  return 'main-content';
}

/**
 * 重要度を判定
 */
export function determineImportance(
  title: string,
  content: string,
  pageNumber: number
): Importance {
  // 最初のページは重要
  if (pageNumber === 0) {
    return 'high';
  }
  
  const text = (title + ' ' + stripHtml(content)).toLowerCase();
  
  // 重要なキーワードが含まれている場合
  const importantKeywords = [
    '重要', '重要度', '核心', 'キー', '主要',
    'important', 'key', 'critical', 'core', 'main'
  ];
  
  if (importantKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  // 付録や参考情報は低重要度
  if (text.includes('付録') || text.includes('参考') || text.includes('appendix') || text.includes('reference')) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * ページメタデータを自動生成
 */
export function generatePageMetadata(
  page: {
    id: string;
    pageNumber: number;
    title: string;
    content: string;
    createdAt: string;
  },
  subMenuId: string,
  totalPages?: number
): PageMetadata {
  const contentType = detectContentType(page.content);
  const keywords = extractKeywords(page.title + ' ' + page.content);
  const semanticCategory = determineSemanticCategory(page.title, page.content, subMenuId);
  const tags = generateTags(page.title, page.content, subMenuId);
  
  const metadata: PageMetadata = {
    ...page,
    contentType,
    keywords,
    semanticCategory,
    tags,
  };
  
  // セクションタイプと重要度は総ページ数が必要
  if (totalPages !== undefined) {
    metadata.sectionType = determineSectionType(page.pageNumber, totalPages, page.content);
    metadata.importance = determineImportance(page.title, page.content, page.pageNumber);
  }
  
  return metadata;
}

/**
 * コサイン類似度を計算
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('ベクトルの次元が一致しません');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }
  
  return dotProduct / denominator;
}

