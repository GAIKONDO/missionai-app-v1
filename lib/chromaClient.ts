/**
 * ChromaDBクライアントの初期化と管理
 * 
 * 注意: ChromaDBのJavaScriptクライアントはブラウザ環境（TauriのWebView内）では動作しません。
 * 現在はRust側でChromaDB Serverを起動し、Tauriコマンド経由でアクセスします。
 * このファイルは後方互換性のために残されていますが、実際の機能はRust側で実装されています。
 */

import { callTauriCommand } from './localFirebase';

// ChromaDBの型定義（動的インポート用）
type ChromaClient = any;

let chromaClient: ChromaClient | null = null;
let chromaDbPath: string | null = null;

/**
 * ChromaDBクライアントを初期化
 * 
 * 注意: ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。
 * Rust側のTauriコマンド（chromadb_save_entity_embedding等）を使用してください。
 */
export async function initChromaClient(): Promise<ChromaClient> {
  // ChromaDBのJavaScriptクライアントはブラウザ環境では動作しないため、
  // エラーをスローしてSQLiteフォールバックを使用するように促す
  throw new Error(
    'ChromaDBのJavaScriptクライアントはブラウザ環境（TauriのWebView内）では動作しません。\n' +
    'Rust側のTauriコマンド（chromadb_save_entity_embedding等）を使用してください。\n' +
    'SQLiteフォールバックが自動的に使用されます。'
  );
  
  // 以下のコードは実行されませんが、型エラーを避けるために残しています
  /*
  if (chromaClient) {
    return chromaClient;
  }

  // クライアント側でのみ実行
  if (typeof window === 'undefined') {
    throw new Error('ChromaDBクライアントはクライアント側でのみ初期化可能です');
  }

  try {
    // ChromaDBを動的インポート（Next.jsのビルドエラーを回避）
    // 注意: ChromaDBのJavaScriptクライアントはNode.js環境向けに設計されており、
    // ブラウザ環境では動作しない可能性が高い
    let ChromaClient: any;
    try {
      const chromadb = await import('chromadb');
      ChromaClient = chromadb.ChromaClient;
    } catch (importError: any) {
      // ChromaDBが利用できない場合（ブラウザ環境など）
      const errorMessage = importError?.message || String(importError);
      if (errorMessage.includes('chunk') || errorMessage.includes('Loading')) {
        throw new Error('ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。SQLiteフォールバックが使用されます。');
      }
      throw new Error(`ChromaDBのインポートに失敗しました: ${errorMessage}`);
    }

    */
}

/**
 * ChromaDBクライアントを取得（初期化済みの場合）
 * 
 * 注意: ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。
 * Rust側のTauriコマンドを使用してください。
 */
export async function getChromaClient(): Promise<ChromaClient> {
  throw new Error(
    'ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。\n' +
    'Rust側のTauriコマンド（chromadb_save_entity_embedding等）を使用してください。'
  );
}

/**
 * ChromaDBコレクション名の定義
 */
export const CHROMA_COLLECTIONS = {
  ENTITIES: 'entities',
  RELATIONS: 'relations',
  TOPICS: 'topics',
  PAGES: 'pages',
} as const;

/**
 * ChromaDBが利用可能かどうか
 * 
 * 注意: ChromaDBのJavaScriptクライアントはNode.js環境向けに設計されており、
 * ブラウザ環境（TauriのWebView内）では動作しません。
 * Rust側でChromaDB Serverが起動している場合は、Tauriコマンド経由で使用できます。
 */
export function isChromaAvailable(): boolean {
  // ChromaDBのJavaScriptクライアントはブラウザ環境では動作しない
  // Rust側でChromaDB Serverが起動している場合は、Tauriコマンド経由で使用可能
  // 実際の利用可能性はRust側の初期化状態に依存する
  return false; // JavaScriptクライアントとしては常にfalse
}

/**
 * コレクションが存在するか確認し、存在しない場合は作成
 * 
 * 注意: ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。
 * Rust側のTauriコマンドを使用してください。
 */
export async function ensureCollection(
  collectionName: string,
  embeddingDimension: number = 1536
): Promise<any> {
  throw new Error(
    'ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。\n' +
    'Rust側のTauriコマンド（chromadb_save_entity_embedding等）を使用してください。\n' +
    'コレクションは自動的に作成されます。'
  );
}

/**
 * ChromaDBの状態を確認
 * 
 * 注意: ChromaDBのJavaScriptクライアントはブラウザ環境では動作しません。
 * Rust側のChromaDB Serverの状態は、Tauriコマンド経由で確認できます。
 */
export async function checkChromaStatus(): Promise<{
  initialized: boolean;
  dbPath: string | null;
  collections: string[];
}> {
  // ChromaDBのJavaScriptクライアントはブラウザ環境では動作しない
  // Rust側のChromaDB Serverの状態は、Tauriコマンド経由で確認可能
  return {
    initialized: false,
    dbPath: null,
    collections: [],
  };
}
