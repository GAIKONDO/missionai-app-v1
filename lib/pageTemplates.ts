/**
 * ページテンプレート管理ユーティリティ
 * Firestoreへの保存・取得機能を提供
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  serverTimestamp 
} from './localFirebase';
import { auth } from './localFirebase';
import { PageMetadata } from '@/types/pageMetadata';
import { getPageStructure } from './pageStructure';

/**
 * undefinedフィールドを削除するユーティリティ関数
 */
function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      if (Array.isArray(obj[key])) {
        // 配列が空でない場合のみ含める
        if (obj[key].length > 0) {
          cleaned[key] = obj[key];
        }
      } else if (typeof obj[key] === 'object') {
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
 * ページテンプレートの型定義
 */
export interface PageTemplate {
  id: string;
  name: string;
  description?: string;
  pageId: string; // 元のページID
  pageTitle: string;
  pageContent: string;
  subMenuId: string;
  planId?: string;
  conceptId?: string;
  structure?: {
    contentStructure?: any;
    formatPattern?: any;
    pageRelations?: any;
  };
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/**
 * テンプレートを保存
 */
export async function savePageTemplate(
  pageId: string,
  name: string,
  description: string,
  planId?: string,
  conceptId?: string
): Promise<string> {
  if (!auth?.currentUser) {
    throw new Error('認証が初期化されていません');
  }

  const userId = auth.currentUser.uid;
  console.log('現在のユーザーID:', userId);

  try {
    // ページデータを取得
    let pageData: PageMetadata | null = null;
    let subMenuId = 'overview';

    if (planId) {
      // 会社本体の事業計画の場合
      const planDoc = await getDoc(doc(null, 'companyBusinessPlan', planId));
      if (planDoc.exists()) {
        const planData = planDoc.data();
        const pagesBySubMenu = (planData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
        
        // すべてのサブメニューからページを検索
        for (const [subMenu, pages] of Object.entries(pagesBySubMenu)) {
          const found = pages.find(p => p.id === pageId);
          if (found) {
            pageData = found;
            subMenuId = subMenu;
            break;
          }
        }
      }
    } else if (conceptId) {
      // 構想の場合
      // まず、conceptIdをドキュメントIDとして試す
      let conceptDoc = await getDoc(doc(null, 'concepts', conceptId));
      
      // ドキュメントIDで見つからない場合、conceptIdフィールドで検索
      if (!conceptDoc.exists()) {
        const conceptsQuery = query(
          collection(null, 'concepts'),
          where('conceptId', '==', conceptId),
          where('userId', '==', userId) // セキュリティルールを満たすためにuserIdも追加
        );
        const conceptsSnapshot = await getDocs(conceptsQuery);
        if (!conceptsSnapshot.empty) {
          conceptDoc = conceptsSnapshot.docs[0];
        }
      }
      
      if (conceptDoc.exists()) {
        const conceptData = conceptDoc.data();
        const pagesBySubMenu = (conceptData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
        
        // すべてのサブメニューからページを検索
        for (const [subMenu, pages] of Object.entries(pagesBySubMenu)) {
          const found = pages.find(p => p.id === pageId);
          if (found) {
            pageData = found;
            subMenuId = subMenu;
            break;
          }
        }
      }
    }

    if (!pageData) {
      throw new Error('ページが見つかりませんでした');
    }

    // 構造データを取得
    let structure = null;
    try {
      structure = await getPageStructure(pageId);
    } catch (error) {
      console.warn(`ページ ${pageId} の構造データ取得エラー:`, error);
    }

    // テンプレートIDを生成
    const templateId = `template-${Date.now()}`;

    // テンプレートデータを作成（undefinedのフィールドを削除）
    const templateData: any = {
      id: templateId,
      name: name.trim(),
      description: description.trim() || '',
      pageId,
      pageTitle: pageData.title,
      pageContent: pageData.content,
      subMenuId,
      userId: userId, // 変数として保持
    };

    // Firestoreに保存するデータを構築（userIdは確実に含める）
    const finalData: any = {
      id: templateId,
      name: name.trim(),
      description: description.trim() || '',
      pageId,
      pageTitle: pageData.title,
      pageContent: pageData.content,
      subMenuId,
      userId: userId, // 確実にuserIdを設定
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // オプショナルフィールドを追加（undefinedでない場合のみ）
    if (planId) {
      finalData.planId = planId;
    }
    if (conceptId) {
      finalData.conceptId = conceptId;
    }
    if (structure) {
      // structure内のundefinedフィールドを削除
      finalData.structure = removeUndefinedFields(structure);
    }

    // データを確認
    const dataToLog = { ...finalData };
    delete dataToLog.createdAt;
    delete dataToLog.updatedAt;
    console.log('保存するテンプレートデータ:', JSON.stringify(dataToLog, null, 2));
    console.log('finalData.userId:', finalData.userId);
    console.log('finalData.userId === userId:', finalData.userId === userId);
    console.log('finalData.userId === auth.currentUser.uid:', finalData.userId === auth.currentUser?.uid);
    console.log('auth.currentUser:', auth.currentUser);
    console.log('Firestoreに保存を試みます...');

    try {
      await setDoc(doc(null, 'pageTemplates', templateId), finalData);
      console.log('✅ Firestoreへの保存が成功しました');
    } catch (setDocError: any) {
      console.error('❌ setDocエラー詳細:', setDocError);
      console.error('エラーコード:', setDocError.code);
      console.error('エラーメッセージ:', setDocError.message);
      throw setDocError;
    }

    console.log('✅ テンプレートを保存しました:', templateId);
    return templateId;
  } catch (error) {
    console.error('テンプレート保存エラー:', error);
    throw error;
  }
}

/**
 * ユーザーのテンプレート一覧を取得
 */
export async function getUserTemplates(
  planId?: string,
  conceptId?: string
): Promise<PageTemplate[]> {
  if (!auth?.currentUser) {
    throw new Error('認証が初期化されていません');
  }

  try {
    // ユーザーが登録したすべてのテンプレートを取得（planIdやconceptIdでのフィルタリングは行わない）
    const q = query(
      collection(null, 'pageTemplates'),
      where('userId', '==', auth.currentUser.uid)
    );

    const snapshot = await getDocs(q);
    const templates: PageTemplate[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        pageId: data.pageId,
        pageTitle: data.pageTitle,
        pageContent: data.pageContent,
        subMenuId: data.subMenuId,
        planId: data.planId,
        conceptId: data.conceptId,
        structure: data.structure,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        userId: data.userId,
      });
    });

    // 作成日時でソート（新しい順）
    templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return templates;
  } catch (error) {
    console.error('テンプレート取得エラー:', error);
    throw error;
  }
}

/**
 * テンプレートを取得
 */
export async function getPageTemplate(templateId: string): Promise<PageTemplate | null> {
  try {
    const docRef = doc(null, 'pageTemplates', templateId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        pageId: data.pageId,
        pageTitle: data.pageTitle,
        pageContent: data.pageContent,
        subMenuId: data.subMenuId,
        planId: data.planId,
        conceptId: data.conceptId,
        structure: data.structure,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        userId: data.userId,
      };
    }
    
    return null;
  } catch (error) {
    console.error('テンプレート取得エラー:', error);
    throw error;
  }
}

/**
 * テンプレートを削除
 */
export async function deletePageTemplate(templateId: string): Promise<void> {
  if (!auth?.currentUser) {
    throw new Error('認証が初期化されていません');
  }

  try {
    // ユーザーが所有しているか確認
    const template = await getPageTemplate(templateId);
    if (!template) {
      throw new Error('テンプレートが見つかりません');
    }

    if (template.userId !== auth.currentUser.uid) {
      throw new Error('このテンプレートを削除する権限がありません');
    }

    await deleteDoc(doc(null, 'pageTemplates', templateId));
    console.log('✅ テンプレートを削除しました:', templateId);
  } catch (error) {
    console.error('テンプレート削除エラー:', error);
    throw error;
  }
}

