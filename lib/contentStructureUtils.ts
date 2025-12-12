/**
 * コンテンツ構造解析ユーティリティ
 * HTMLコンテンツから構造情報を抽出するための関数群
 */

import { ContentStructure } from '@/types/pageMetadata';
import { stripHtml } from './pageMetadataUtils';

/**
 * HTMLコンテンツから見出しを抽出
 */
export function extractHeadings(html: string): Array<{ level: number; text: string; position: number }> {
  const headings: Array<{ level: number; text: string; position: number }> = [];
  const textContent = stripHtml(html);
  let currentPosition = 0;

  // h1-h6タグを検索
  const headingPattern = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = headingPattern.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const headingText = stripHtml(match[2]).trim();
    
    if (headingText) {
      // 見出しの位置をテキスト内での位置で計算
      const headingIndex = html.indexOf(match[0]);
      const beforeHeading = html.substring(0, headingIndex);
      const position = stripHtml(beforeHeading).length;
      
      headings.push({
        level,
        text: headingText,
        position,
      });
    }
  }

  return headings;
}

/**
 * HTMLコンテンツからセクションを抽出
 */
export function extractSections(html: string): Array<{
  title: string;
  startPosition: number;
  endPosition: number;
  type: 'paragraph' | 'list' | 'table' | 'diagram' | 'code' | 'image';
}> {
  const sections: Array<{
    title: string;
    startPosition: number;
    endPosition: number;
    type: 'paragraph' | 'list' | 'table' | 'diagram' | 'code' | 'image';
  }> = [];
  
  const textContent = stripHtml(html);
  let currentPosition = 0;

  // 各要素タイプを検出
  const patterns = [
    {
      regex: /<p[^>]*>(.*?)<\/p>/gi,
      type: 'paragraph' as const,
    },
    {
      regex: /<ul[^>]*>[\s\S]*?<\/ul>|<ol[^>]*>[\s\S]*?<\/ol>/gi,
      type: 'list' as const,
    },
    {
      regex: /<table[^>]*>[\s\S]*?<\/table>/gi,
      type: 'table' as const,
    },
    {
      regex: /<div[^>]*class=["'][^"']*mermaid[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      type: 'diagram' as const,
    },
    {
      regex: /<pre[^>]*>[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>/gi,
      type: 'code' as const,
    },
    {
      regex: /<img[^>]*>/gi,
      type: 'image' as const,
    },
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(html)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      
      // テキスト内での位置を計算
      const beforeSection = html.substring(0, startIndex);
      const startPosition = stripHtml(beforeSection).length;
      const endPosition = startPosition + stripHtml(match[0]).length;
      
      // タイトルを抽出（直前の見出しまたは要素のテキスト）
      let title = '';
      const beforeText = html.substring(0, startIndex);
      const headingMatch = beforeText.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      if (headingMatch) {
        title = stripHtml(headingMatch[1]).trim();
      } else {
        title = stripHtml(match[0]).substring(0, 50).trim();
      }

      sections.push({
        title: title || `セクション ${sections.length + 1}`,
        startPosition,
        endPosition,
        type: pattern.type,
      });
    }
  }

  // 位置でソート
  sections.sort((a, b) => a.startPosition - b.startPosition);

  return sections;
}

/**
 * HTMLコンテンツから各種要素の有無を検出
 */
export function detectContentElements(html: string): {
  hasImages: boolean;
  hasDiagrams: boolean;
  hasTables: boolean;
  hasLists: boolean;
} {
  return {
    hasImages: /<img[^>]*>/i.test(html),
    hasDiagrams: /mermaid|mermaid-diagram-container/i.test(html),
    hasTables: /<table[^>]*>/i.test(html),
    hasLists: /<ul[^>]*>|<ol[^>]*>/i.test(html),
  };
}

/**
 * 文字数をカウント（日本語を考慮）
 */
export function countWords(text: string): number {
  // HTMLタグを除去
  const cleanText = stripHtml(text);
  
  // 日本語文字（ひらがな、カタカナ、漢字）を1文字としてカウント
  // 英数字は単語としてカウント
  const japaneseChars = cleanText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || [];
  const englishWords = cleanText.match(/[a-zA-Z0-9]+/g) || [];
  
  return japaneseChars.length + englishWords.length;
}

/**
 * 読了時間を推定（分）
 * 日本語: 400文字/分、英語: 200単語/分
 */
export function estimateReadingTime(text: string): number {
  const cleanText = stripHtml(text);
  
  // 日本語文字数
  const japaneseChars = (cleanText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  
  // 英語単語数
  const englishWords = (cleanText.match(/[a-zA-Z0-9]+/g) || []).length;
  
  // 読了時間を計算（日本語400文字/分、英語200単語/分）
  const japaneseTime = japaneseChars / 400;
  const englishTime = englishWords / 200;
  
  const totalTime = japaneseTime + englishTime;
  
  // 最低1分、小数点第1位で四捨五入
  return Math.max(1, Math.round(totalTime * 10) / 10);
}

/**
 * コンテンツ構造を解析
 */
export function analyzeContentStructure(
  pageId: string,
  content: string
): ContentStructure {
  const headings = extractHeadings(content);
  const sections = extractSections(content);
  const elements = detectContentElements(content);
  const wordCount = countWords(content);
  const readingTime = estimateReadingTime(content);

  return {
    pageId,
    headings: headings.length > 0 ? headings : undefined,
    sections: sections.length > 0 ? sections : undefined,
    ...elements,
    wordCount,
    readingTime,
  };
}

