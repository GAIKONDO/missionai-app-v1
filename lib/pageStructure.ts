/**
 * ページ構造データの管理ユーティリティ
 * Firestoreへの保存・取得機能を提供
 */

import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from './localFirebase';
import { ContentStructure, PageRelations, FormatPattern } from '@/types/pageMetadata';
import { analyzeContentStructure } from './contentStructureUtils';
import { analyzePageRelations } from './pageRelationsUtils';
import { analyzeFormatPattern } from './formatPatternUtils';

/**
 * オブジェクトからundefinedのフィールドを削除
 */
function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      if (Array.isArray(obj[key])) {
        // 配列が空でない場合のみ含める
        if (obj[key].length > 0) {
          cleaned[key] = obj[key];
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // オブジェクトの場合、再帰的に処理
        const cleanedObj = removeUndefinedFields(obj[key]);
        if (Object.keys(cleanedObj).length > 0) {
          cleaned[key] = cleanedObj as T[Extract<keyof T, string>];
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  }
  return cleaned;
}

/**
 * ページ構造データを保存
 */
export async function savePageStructure(
  pageId: string,
  content: string,
  title: string,
  allPages: Array<{ id: string; pageNumber: number; subMenuId?: string }>,
  subMenuId?: string,
  semanticCategory?: string,
  keywords?: string[]
): Promise<void> {
  try {
    console.log('📊 ページ構造データの生成を開始:', pageId);
    
    // コンテンツ構造を解析
    const contentStructure = analyzeContentStructure(pageId, content);
    console.log('✅ コンテンツ構造を解析しました:', {
      headings: contentStructure.headings?.length || 0,
      sections: contentStructure.sections?.length || 0,
      wordCount: contentStructure.wordCount,
      readingTime: contentStructure.readingTime,
    });

    // フォーマットパターンを解析
    const formatPattern = analyzeFormatPattern(pageId, content, title);
    console.log('✅ フォーマットパターンを解析しました:', {
      layoutType: formatPattern.layoutType,
      hasKeyMessage: formatPattern.stylePattern?.hasKeyMessage,
      structure: formatPattern.contentPattern?.structure,
    });

    // ページ間の関連性を解析（非同期）
    let pageRelations;
    try {
      pageRelations = await analyzePageRelations(
        pageId,
        title,
        content,
        allPages,
        subMenuId,
        semanticCategory,
        keywords
      );
      console.log('✅ ページ間の関連性を解析しました:', {
        previousPageId: pageRelations.previousPageId,
        nextPageId: pageRelations.nextPageId,
        similarPagesCount: pageRelations.similarPages?.length || 0,
        referencesCount: pageRelations.references?.length || 0,
      });
    } catch (relationsError) {
      console.warn('⚠️ ページ間の関連性の解析でエラーが発生しました（続行します）:', relationsError);
      // 関連性の解析に失敗しても、他のデータは保存する
      pageRelations = {
        pageId,
        similarPages: [],
      };
    }

    // Firestoreに保存（undefinedのフィールドを削除）
    const cleanContentStructure = removeUndefinedFields(contentStructure);
    const cleanFormatPattern = removeUndefinedFields(formatPattern);
    const cleanPageRelations = removeUndefinedFields(pageRelations);

    const structureData = {
      pageId,
      contentStructure: cleanContentStructure,
      formatPattern: cleanFormatPattern,
      pageRelations: cleanPageRelations,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(null, 'pageStructures', pageId), structureData);
    
    console.log('✅ ページ構造データを保存しました:', pageId);
  } catch (error) {
    console.error('❌ ページ構造データの保存エラー:', error);
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

/**
 * ページ構造データを非同期で生成・保存
 * エラーが発生しても処理を続行する（オプショナルな機能のため）
 */
export async function savePageStructureAsync(
  pageId: string,
  content: string,
  title: string,
  allPages: Array<{ id: string; pageNumber: number; subMenuId?: string }>,
  subMenuId?: string,
  semanticCategory?: string,
  keywords?: string[]
): Promise<void> {
  console.log('🚀 ページ構造データの非同期保存を開始:', pageId);
  
  // 非同期で実行（エラーは無視）
  savePageStructure(
    pageId,
    content,
    title,
    allPages,
    subMenuId,
    semanticCategory,
    keywords
  ).catch((error) => {
    console.warn('⚠️ ページ構造データの非同期保存でエラーが発生しました（無視されます）:', error);
    if (error instanceof Error) {
      console.warn('エラー詳細:', {
        message: error.message,
        stack: error.stack,
      });
    }
  });
}

/**
 * ページ構造データを取得
 */
export async function getPageStructure(pageId: string): Promise<{
  contentStructure?: ContentStructure;
  formatPattern?: FormatPattern;
  pageRelations?: PageRelations;
} | null> {
  try {
    const docRef = doc(null, 'pageStructures', pageId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        contentStructure: data.contentStructure,
        formatPattern: data.formatPattern,
        pageRelations: data.pageRelations,
      };
    }
    
    return null;
  } catch (error) {
    console.error('ページ構造データの取得エラー:', error);
    throw error;
  }
}

