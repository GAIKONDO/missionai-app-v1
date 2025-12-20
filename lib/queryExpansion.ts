/**
 * クエリ拡張とリライティング
 * 検索精度向上のため、クエリを拡張・最適化する機能
 */

/**
 * 同義語・関連語のマッピング
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // 会社・企業関連
  '会社': ['企業', '法人', 'コーポレーション', 'corporation', 'company'],
  '企業': ['会社', '法人', 'コーポレーション', 'corporation', 'company'],
  '組織': ['団体', '機関', 'organization', 'org'],
  
  // 特定の会社名（よく検索される可能性があるもの）
  'ベルシステム24': ['BS24', 'ベルシステム', 'Bell System 24', 'bell system'],
  'BS24': ['ベルシステム24', 'ベルシステム', 'Bell System 24'],
  'トヨタ': ['トヨタ自動車', 'Toyota', 'toyota'],
  'トヨタ自動車': ['トヨタ', 'Toyota', 'toyota'],
  
  // 人・役職関連
  '部長': ['マネージャー', 'manager', 'マネージャ'],
  '課長': ['リーダー', 'leader', 'チームリーダー'],
  '社長': ['CEO', '代表取締役', 'president'],
  '担当者': ['責任者', 'オーナー', 'owner', 'responsible'],
  
  // プロジェクト・施策関連
  'プロジェクト': ['施策', '計画', 'project', 'initiative', '計画'],
  '施策': ['プロジェクト', '計画', 'initiative', 'project'],
  '計画': ['プロジェクト', '施策', 'plan', 'project'],
  'AI施策': ['AIプロジェクト', 'AI計画', 'AI活用', 'AI導入', 'artificial intelligence'],
  'AI活用': ['AI施策', 'AI導入', 'AI利用', 'AI応用'],
  
  // 技術・ツール関連
  'システム': ['アプリケーション', 'アプリ', 'application', 'app', 'システム'],
  'ツール': ['ソフトウェア', 'アプリケーション', 'software', 'tool'],
  '技術': ['テクノロジー', 'technology', 'tech'],
  
  // 関係性関連
  '関連': ['関係', 'つながり', 'related', 'relation', 'connection'],
  '関係': ['関連', 'つながり', 'relation', 'related', 'connection'],
  '提携': ['パートナーシップ', '協力', 'partnership', 'collaboration'],
  '出資': ['投資', 'investment', 'invest'],
  '子会社': ['サブシディアリー', 'subsidiary'],
  
  // 時間関連
  '最新': ['最近', '新しく', 'recent', 'latest', 'new'],
  '最近': ['最新', '新しく', 'recent', 'latest'],
  '重要': ['優先', '緊急', 'important', 'priority', 'critical'],
  '優先': ['重要', '緊急', 'priority', 'important'],
};

/**
 * クエリタイプの判定
 */
export type QueryIntent = 
  | 'entity_search'      // エンティティ検索
  | 'relation_search'    // リレーション検索
  | 'topic_search'       // トピック検索
  | 'design_doc_search'  // システム設計ドキュメント検索
  | 'general_search';    // 一般的な検索

/**
 * クエリの意図を判定
 */
export function detectQueryIntent(queryText: string): QueryIntent {
  const queryLower = queryText.toLowerCase();
  
  // システム設計ドキュメント関連のキーワード
  if (queryLower.includes('システム設計') || 
      queryLower.includes('アーキテクチャ') ||
      queryLower.includes('architecture') ||
      queryLower.includes('設計') ||
      queryLower.includes('実装') ||
      queryLower.includes('tauri') ||
      queryLower.includes('chromadb') ||
      queryLower.includes('データベース')) {
    return 'design_doc_search';
  }
  
  // リレーション検索のキーワード
  if (queryLower.includes('関係') || 
      queryLower.includes('関連') ||
      queryLower.includes('つながり') ||
      queryLower.includes('提携') ||
      queryLower.includes('出資') ||
      queryLower.includes('子会社') ||
      queryLower.includes('relation') ||
      queryLower.includes('related') ||
      queryLower.includes('partnership')) {
    return 'relation_search';
  }
  
  // トピック検索のキーワード
  if (queryLower.includes('議事録') || 
      queryLower.includes('会議') ||
      queryLower.includes('トピック') ||
      queryLower.includes('meeting') ||
      queryLower.includes('topic') ||
      queryLower.includes('議題')) {
    return 'topic_search';
  }
  
  // エンティティ検索のキーワード（人名、会社名など）
  if (queryLower.match(/^[A-Za-z0-9\s]+$/) || // アルファベットのみ
      queryLower.includes('会社') ||
      queryLower.includes('企業') ||
      queryLower.includes('人') ||
      queryLower.includes('担当者') ||
      queryLower.includes('部長') ||
      queryLower.includes('課長')) {
    return 'entity_search';
  }
  
  return 'general_search';
}

/**
 * クエリを拡張（同義語・関連語を追加）
 */
export function expandQuery(queryText: string, maxExpansions: number = 3): string[] {
  const queryLower = queryText.toLowerCase().trim();
  const words = queryLower.split(/\s+/);
  const expandedQueries: string[] = [queryText]; // 元のクエリを含める
  
  // 各単語に対して同義語を探す
  const synonyms: string[] = [];
  for (const word of words) {
    // 完全一致の同義語
    if (SYNONYM_MAP[word]) {
      synonyms.push(...SYNONYM_MAP[word].slice(0, maxExpansions));
    }
    
    // 部分一致の同義語（「会社」が「企業」の同義語として含まれる場合など）
    for (const [key, values] of Object.entries(SYNONYM_MAP)) {
      if (word.includes(key) || key.includes(word)) {
        synonyms.push(...values.slice(0, maxExpansions));
      }
    }
  }
  
  // 同義語を追加したクエリを生成
  if (synonyms.length > 0) {
    // ユニークな同義語のみを取得
    const uniqueSynonyms = Array.from(new Set(synonyms));
    
    // 各同義語を元のクエリに追加
    for (const synonym of uniqueSynonyms.slice(0, maxExpansions)) {
      // 元のクエリに同義語を追加
      expandedQueries.push(`${queryText} ${synonym}`);
      // 同義語で置き換えたクエリ
      const replacedQuery = words.map(word => {
        for (const [key, values] of Object.entries(SYNONYM_MAP)) {
          if (word === key && values.includes(synonym)) {
            return synonym;
          }
        }
        return word;
      }).join(' ');
      if (replacedQuery !== queryText) {
        expandedQueries.push(replacedQuery);
      }
    }
  }
  
  // 重複を除去して返す
  return Array.from(new Set(expandedQueries));
}

/**
 * クエリをリライティング（検索意図に応じて最適化）
 */
export function rewriteQuery(
  queryText: string,
  intent?: QueryIntent
): string {
  const detectedIntent = intent || detectQueryIntent(queryText);
  let rewritten = queryText.trim();
  
  // 意図に応じたリライティング
  switch (detectedIntent) {
    case 'entity_search':
      // エンティティ検索の場合、名前の部分一致を強化
      // 「トヨタ」→「トヨタ OR トヨタ自動車 OR Toyota」
      const entityWords = rewritten.split(/\s+/);
      if (entityWords.length === 1) {
        // 単一の単語の場合、関連語を追加
        const word = entityWords[0];
        if (SYNONYM_MAP[word]) {
          rewritten = `${word} ${SYNONYM_MAP[word].slice(0, 2).join(' ')}`;
        }
      }
      break;
      
    case 'relation_search':
      // リレーション検索の場合、関係性のキーワードを強化
      if (!rewritten.includes('関係') && !rewritten.includes('関連')) {
        rewritten = `${rewritten} 関係 関連`;
      }
      break;
      
    case 'topic_search':
      // トピック検索の場合、議事録関連のキーワードを追加
      if (!rewritten.includes('議事録') && !rewritten.includes('会議')) {
        rewritten = `${rewritten} 議事録 会議`;
      }
      break;
      
    case 'design_doc_search':
      // システム設計ドキュメント検索の場合、技術キーワードを強化
      if (!rewritten.includes('システム') && !rewritten.includes('設計')) {
        rewritten = `${rewritten} システム 設計`;
      }
      break;
      
    default:
      // 一般的な検索の場合はそのまま
      break;
  }
  
  return rewritten;
}

/**
 * クエリを正規化（表記ゆれの統一、不要な文字の除去）
 */
export function normalizeQuery(queryText: string): string {
  let normalized = queryText.trim();
  
  // 全角・半角の統一（英数字は半角に）
  normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  
  // 連続するスペースを1つに
  normalized = normalized.replace(/\s+/g, ' ');
  
  // 前後の不要な文字を除去
  normalized = normalized.replace(/^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+|[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/g, '');
  
  return normalized;
}

/**
 * クエリ拡張とリライティングを統合実行
 */
export interface ExpandedQuery {
  original: string;
  normalized: string;
  rewritten: string;
  expanded: string[];
  intent: QueryIntent;
}

export function processQuery(queryText: string): ExpandedQuery {
  const normalized = normalizeQuery(queryText);
  const intent = detectQueryIntent(normalized);
  const rewritten = rewriteQuery(normalized, intent);
  const expanded = expandQuery(rewritten, 3);
  
  return {
    original: queryText,
    normalized,
    rewritten,
    expanded,
    intent,
  };
}

/**
 * 複数のクエリパターンで検索を実行し、結果を統合
 * この関数は実際の検索関数を受け取り、複数のクエリで検索を実行する
 */
export async function searchWithQueryExpansion<T>(
  queryText: string,
  searchFunction: (query: string) => Promise<T[]>,
  mergeFunction: (results: T[][]) => T[],
  maxExpansions: number = 3
): Promise<T[]> {
  const processed = processQuery(queryText);
  
  // 元のクエリと拡張クエリで検索を実行
  const searchQueries = [
    processed.rewritten, // リライティングされたクエリを優先
    ...processed.expanded.slice(0, maxExpansions), // 拡張クエリ
  ];
  
  // 重複を除去
  const uniqueQueries = Array.from(new Set(searchQueries));
  
  console.log(`[searchWithQueryExpansion] 🔍 クエリ拡張: 元のクエリ="${queryText}", 拡張クエリ数=${uniqueQueries.length}, 意図=${processed.intent}`);
  
  // 並列で検索を実行
  const searchResults = await Promise.all(
    uniqueQueries.map(query => searchFunction(query).catch(error => {
      console.warn(`[searchWithQueryExpansion] クエリ "${query}" の検索エラー:`, error);
      return [];
    }))
  );
  
  // 結果を統合
  const mergedResults = mergeFunction(searchResults);
  
  console.log(`[searchWithQueryExpansion] ✅ 検索完了: 元のクエリ="${queryText}", 検索結果数=${mergedResults.length}`);
  
  return mergedResults;
}
