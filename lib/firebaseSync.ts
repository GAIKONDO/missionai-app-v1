/**
 * Firebaseとローカルデータベース間の同期機能
 * 手動で実行できるインポート/エクスポート機能
 */

import { collection, getDocs, doc, getDoc, setDoc } from './localFirebase';

// Tauri環境ではFirebaseは使用しないため、このファイルの機能は無効化されます
const firebaseDb = null;

// Tauri環境を検出（ポート3010で実行されている場合もTauri環境とみなす）
const isTauri = typeof window !== 'undefined' && (
  '__TAURI__' in window || 
  window.location.port === '3010' ||
  (window.location.hostname === 'localhost' && window.location.port === '3010')
);

// Tauriコマンドを呼び出すヘルパー関数
async function callTauriCommand(command: string, args?: any): Promise<any> {
  if (!isTauri) {
    throw new Error('この機能はTauri環境でのみ使用できます');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(command, args);
}

// Firebaseからデータを取得してローカルDBにインポート
export async function importFromFirebase(collectionNames?: string[]): Promise<{ success: boolean; message: string; imported: number }> {
  // Tauri環境ではFirebaseは使用しないため、この機能は無効化されています
  throw new Error('この機能はTauri環境では使用できません。Tauri環境ではローカルデータベースのみを使用します。');

  // デフォルトのコレクション一覧
  const defaultCollections = [
    'users',
    'companyBusinessPlan',
    'businessProjects',
    'servicePlans',
    'concepts',
    'pageEmbeddings',
    'pageStructures',
    'admins',
    'approvalRequests',
  ];

  const collectionsToImport = collectionNames || defaultCollections;
  let totalImported = 0;

  try {
    // 各コレクションからデータを取得
    for (const collectionName of collectionsToImport) {
      try {
        const snapshot = await getDocs(collection(firebaseDb, collectionName));
        const docs = snapshot.docs;

        // 各ドキュメントをローカルDBに保存
        for (const firebaseDoc of docs) {
          const data = firebaseDoc.data();
          
          // TauriコマンドでローカルDBに保存
          await callTauriCommand('doc_set', {
            collectionName: collectionName,
            docId: firebaseDoc.id,
            data: data,
          });

          totalImported++;
        }
      } catch (error: any) {
        console.error(`コレクション ${collectionName} のインポートエラー:`, error);
        // エラーが発生しても続行
      }
    }

    return {
      success: true,
      message: `${totalImported}件のデータをFirebaseからインポートしました`,
      imported: totalImported,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `インポートエラー: ${error.message}`,
      imported: totalImported,
    };
  }
}

// ローカルDBからデータを取得してFirebaseにエクスポート
export async function exportToFirebase(collectionNames?: string[]): Promise<{ success: boolean; message: string; exported: number }> {
  // Tauri環境ではFirebaseは使用しないため、この機能は無効化されています
  throw new Error('この機能はTauri環境では使用できません。Tauri環境ではローカルデータベースのみを使用します。');

  // デフォルトのコレクション一覧
  const defaultCollections = [
    'users',
    'companyBusinessPlan',
    'businessProjects',
    'servicePlans',
    'concepts',
    'pageEmbeddings',
    'pageStructures',
    'admins',
    'approvalRequests',
  ];

  const collectionsToExport = collectionNames || defaultCollections;
  let totalExported = 0;

  try {
    // 各コレクションからデータを取得
    for (const collectionName of collectionsToExport) {
      try {
        // TauriコマンドでローカルDBからデータを取得
        const result = await callTauriCommand('collection_get', {
          collectionName: collectionName,
        });

        const docs = result || [];

        // 各ドキュメントをFirebaseに保存
        for (const docData of docs) {
          const docId = docData.id;
          const data = docData.data || docData;

          // Firebaseに保存
          await setDoc(doc(firebaseDb, collectionName, docId), data);

          totalExported++;
        }
      } catch (error: any) {
        console.error(`コレクション ${collectionName} のエクスポートエラー:`, error);
        // エラーが発生しても続行
      }
    }

    return {
      success: true,
      message: `${totalExported}件のデータをFirebaseにエクスポートしました`,
      exported: totalExported,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `エクスポートエラー: ${error.message}`,
      exported: totalExported,
    };
  }
}

// FirebaseからローカルDBへの一方向同期（既存データを上書き）
export async function syncFromFirebase(collectionNames?: string[]): Promise<{ success: boolean; message: string; synced: number }> {
  const result = await importFromFirebase(collectionNames);
  return { success: result.success, message: result.message, synced: result.imported };
}

// ローカルDBからFirebaseへの一方向同期（既存データを上書き）
export async function syncToFirebase(collectionNames?: string[]): Promise<{ success: boolean; message: string; synced: number }> {
  const result = await exportToFirebase(collectionNames);
  return { success: result.success, message: result.message, synced: result.exported };
}

