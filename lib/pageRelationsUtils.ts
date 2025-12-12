/**
 * ページ間の関連性検出ユーティリティ
 * ページ間の関係性を自動検出するための関数群
 */

import { PageRelations } from '@/types/pageMetadata';
import { findSimilarPagesByPageId } from './pageEmbeddings';

/**
 * ページ間の前後関係を検出
 */
export function detectPageSequence(
  pageId: string,
  allPages: Array<{ id: string; pageNumber: number; subMenuId?: string }>,
  subMenuId?: string
): { previousPageId?: string; nextPageId?: string } {
  // 同じサブメニュー内のページをフィルタ
  const pagesInSubMenu = subMenuId
    ? allPages.filter(p => p.subMenuId === subMenuId)
    : allPages;

  // ページ番号でソート
  const sortedPages = [...pagesInSubMenu].sort((a, b) => a.pageNumber - b.pageNumber);

  const currentIndex = sortedPages.findIndex(p => p.id === pageId);

  if (currentIndex === -1) {
    return {};
  }

  return {
    previousPageId: currentIndex > 0 ? sortedPages[currentIndex - 1].id : undefined,
    nextPageId: currentIndex < sortedPages.length - 1 ? sortedPages[currentIndex + 1].id : undefined,
  };
}

/**
 * HTMLコンテンツから参照（リンク）を抽出
 * 現在はページIDへの参照を検出する想定
 */
export function extractReferences(content: string): string[] {
  const references: string[] = [];

  // ページIDへの参照パターンを検出
  // 例: data-page-id="page-xxx" や pageId="xxx" など
  const pageIdPatterns = [
    /data-page-id=["']([^"']+)["']/gi,
    /pageId=["']([^"']+)["']/gi,
    /page-id=["']([^"']+)["']/gi,
  ];

  for (const pattern of pageIdPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const pageId = match[1];
      if (pageId && !references.includes(pageId)) {
        references.push(pageId);
      }
    }
  }

  return references;
}

/**
 * トピックを抽出（キーワードベースの簡易版）
 */
export function extractTopics(
  title: string,
  content: string,
  keywords?: string[]
): string[] {
  const topics: string[] = [];

  // キーワードからトピックを生成
  if (keywords && keywords.length > 0) {
    topics.push(...keywords);
  }

  // タイトルから主要なトピックを抽出
  const titleWords = title.split(/[・、，,]/).map(w => w.trim()).filter(Boolean);
  topics.push(...titleWords);

  // 重複を除去
  return Array.from(new Set(topics));
}

/**
 * トピック階層を構築（簡易版）
 */
export function buildTopicHierarchy(
  title: string,
  semanticCategory?: string
): Array<{ level: number; topic: string }> {
  const hierarchy: Array<{ level: number; topic: string }> = [];

  // セマンティックカテゴリをレベル1として設定
  if (semanticCategory) {
    hierarchy.push({ level: 1, topic: semanticCategory });
  }

  // タイトルをレベル2として設定
  hierarchy.push({ level: 2, topic: title });

  return hierarchy;
}

/**
 * ページ間の関連性を検出
 */
export async function analyzePageRelations(
  pageId: string,
  title: string,
  content: string,
  allPages: Array<{ id: string; pageNumber: number; subMenuId?: string }>,
  subMenuId?: string,
  semanticCategory?: string,
  keywords?: string[]
): Promise<PageRelations> {
  // 前後関係を検出
  const sequence = detectPageSequence(pageId, allPages, subMenuId);

  // 参照関係を検出
  const references = extractReferences(content);

  // 類似ページを検出（埋め込みベース）
  let similarPages: Array<{ pageId: string; similarity: number }> = [];
  try {
    similarPages = await findSimilarPagesByPageId(pageId, 5);
  } catch (error) {
    console.warn('類似ページの検出でエラーが発生しました:', error);
  }

  // トピックを抽出
  const topics = extractTopics(title, content, keywords);

  // トピック階層を構築
  const topicHierarchy = buildTopicHierarchy(title, semanticCategory);

  return {
    pageId,
    ...sequence,
    similarPages: similarPages.map(sp => ({
      pageId: sp.pageId,
      similarity: sp.similarity,
    })),
    references: references.length > 0 ? references : undefined,
    topics: topics.length > 0 ? topics : undefined,
    topicHierarchy: topicHierarchy.length > 0 ? topicHierarchy : undefined,
  };
}

