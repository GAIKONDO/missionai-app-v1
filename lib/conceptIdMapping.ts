/**
 * 構想IDのマッピング管理
 * 
 * タイムスタンプベースのID（アルファベット + 数値）と文字列IDのマッピングを管理し、IDの衝突を防ぎます
 * 形式: {prefix}{timestamp} 例: care1764739651096
 */

export interface ConceptIdMapping {
  /** タイムスタンプベースID（URLで使用、例: care1764739651096） */
  timestampId: string;
  /** 文字列ID（内部識別用、例: care-support） */
  stringId: string;
  /** 構想名 */
  name: string;
  /** 説明 */
  description: string;
}

/**
 * タイムスタンプベースのIDを生成
 * 形式: {prefix}{timestamp}
 */
function generateTimestampId(prefix: string, timestamp: number = Date.now()): string {
  return `${prefix}${timestamp}`;
}

/**
 * サービスごとの固定構想IDマッピング
 * タイムスタンプは固定値を使用（IDの一貫性のため）
 */
export const CONCEPT_ID_MAPPINGS: { [serviceId: string]: ConceptIdMapping[] } = {
  'own-service': [
    { timestampId: 'maternity1764739000000', stringId: 'maternity-support', name: '出産支援パーソナルApp', description: '出産前後のママとパパをサポートするパーソナルアプリケーション' },
    { timestampId: 'care1764739100000', stringId: 'care-support', name: '介護支援パーソナルApp', description: '介護を必要とする方とその家族をサポートするパーソナルアプリケーション' },
    { timestampId: 'maternity1764739200000', stringId: 'maternity-support-componentized', name: '出産支援パーソナルApp（コンポーネント化版）', description: '出産前後のママとパパをサポートするパーソナルアプリケーション（コンポーネント化版）' },
    { timestampId: 'care1764739300000', stringId: 'care-support-componentized', name: '介護支援パーソナルApp（コンポーネント化版）', description: '介護を必要とする方とその家族をサポートするパーソナルアプリケーション（コンポーネント化版）' },
  ],
  'ai-dx': [
    { timestampId: 'medical1764739400000', stringId: 'medical-dx', name: '医療法人向けDX', description: '' },
    { timestampId: 'sme1764739500000', stringId: 'sme-dx', name: '中小企業向けDX', description: '' },
  ],
  'consulting': [
    { timestampId: 'sme1764739600000', stringId: 'sme-process', name: '中小企業向け業務プロセス可視化・改善', description: '' },
    { timestampId: 'medical1764739700000', stringId: 'medical-care-process', name: '医療・介護施設向け業務プロセス可視化・改善', description: '' },
  ],
  'education-training': [
    { timestampId: 'corporate1764739800000', stringId: 'corporate-ai-training', name: '大企業向けAI人材育成・教育', description: '' },
    { timestampId: 'governance1764739900000', stringId: 'ai-governance', name: 'AI導入ルール設計・ガバナンス支援', description: '' },
    { timestampId: 'sme1764740000000', stringId: 'sme-ai-education', name: '中小企業向けAI導入支援・教育', description: '' },
  ],
  'component-test': [
    { timestampId: 'test1764740100000', stringId: 'test-concept', name: 'テスト構想', description: '' },
  ],
};

/**
 * タイムスタンプIDから文字列IDを取得
 */
export function getStringIdFromTimestampId(serviceId: string, timestampId: string): string | null {
  const mappings = CONCEPT_ID_MAPPINGS[serviceId];
  if (!mappings) return null;
  
  const mapping = mappings.find(m => m.timestampId === timestampId);
  return mapping ? mapping.stringId : null;
}

/**
 * 文字列IDからタイムスタンプIDを取得
 */
export function getTimestampIdFromStringId(serviceId: string, stringId: string): string | null {
  const mappings = CONCEPT_ID_MAPPINGS[serviceId];
  if (!mappings) return null;
  
  const mapping = mappings.find(m => m.stringId === stringId);
  return mapping ? mapping.timestampId : null;
}

/**
 * タイムスタンプIDから構想情報を取得
 */
export function getConceptInfoFromTimestampId(serviceId: string, timestampId: string): ConceptIdMapping | null {
  const mappings = CONCEPT_ID_MAPPINGS[serviceId];
  if (!mappings) return null;
  
  return mappings.find(m => m.timestampId === timestampId) || null;
}

/**
 * 文字列IDから構想情報を取得
 */
export function getConceptInfoFromStringId(serviceId: string, stringId: string): ConceptIdMapping | null {
  const mappings = CONCEPT_ID_MAPPINGS[serviceId];
  if (!mappings) return null;
  
  return mappings.find(m => m.stringId === stringId) || null;
}

/**
 * URLパスからタイムスタンプIDまたは文字列IDを取得（後方互換性のため）
 */
export function parseConceptIdFromPath(conceptIdParam: string): { timestampId: string | null; stringId: string | null } {
  // タイムスタンプID形式（アルファベット + 数値）をチェック
  // 例: care1764739651096
  const timestampIdMatch = conceptIdParam.match(/^([a-z-]+)(\d+)$/);
  if (timestampIdMatch) {
    return { timestampId: conceptIdParam, stringId: null };
  }
  
  // 文字列IDの場合は文字列IDとして扱う（後方互換性）
  return { timestampId: null, stringId: conceptIdParam };
}

/**
 * サービスIDとconceptIdパラメータから実際の文字列IDを取得
 */
export function resolveConceptId(serviceId: string, conceptIdParam: string): string {
  const { timestampId, stringId } = parseConceptIdFromPath(conceptIdParam);
  
  if (timestampId) {
    const resolvedStringId = getStringIdFromTimestampId(serviceId, timestampId);
    if (resolvedStringId) {
      return resolvedStringId;
    }
  }
  
  // 文字列IDの場合はそのまま返す（後方互換性）
  return stringId || conceptIdParam;
}

/**
 * サービスIDと文字列IDからURL用のタイムスタンプIDを取得
 */
export function getUrlConceptId(serviceId: string, stringId: string): string {
  const timestampId = getTimestampIdFromStringId(serviceId, stringId);
  if (timestampId) {
    return timestampId;
  }
  
  // マッピングがない場合は文字列IDをそのまま返す（後方互換性）
  return stringId;
}

