/**
 * システム設計ドキュメントセクション関係管理
 * SQLiteに保存されたセクション間の関係を管理
 */

import { callTauriCommand } from './localFirebase';

export interface DesignDocSectionRelation {
  id: string;
  sourceSectionId: string;
  targetSectionId: string;
  relationType: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * セクション関係を作成
 */
export async function createSectionRelation(
  sourceSectionId: string,
  targetSectionId: string,
  relationType: string,
  description?: string,
): Promise<DesignDocSectionRelation> {
  const result = await callTauriCommand('create_design_doc_section_relation_cmd', {
    sourceSectionId,
    targetSectionId,
    relationType,
    description: description || null,
  });

  return result as DesignDocSectionRelation;
}

/**
 * セクション関係を更新
 */
export async function updateSectionRelation(
  id: string,
  relationType?: string,
  description?: string,
): Promise<DesignDocSectionRelation> {
  const result = await callTauriCommand('update_design_doc_section_relation_cmd', {
    id,
    relationType: relationType || null,
    description: description !== undefined ? description : null,
  });

  return result as DesignDocSectionRelation;
}

/**
 * IDでセクション関係を取得
 */
export async function getSectionRelation(id: string): Promise<DesignDocSectionRelation> {
  const result = await callTauriCommand('get_design_doc_section_relation_cmd', { id });
  return result as DesignDocSectionRelation;
}

/**
 * セクションIDでセクション関係を取得
 */
export async function getSectionRelationsBySection(sectionId: string): Promise<DesignDocSectionRelation[]> {
  const results = await callTauriCommand('get_design_doc_section_relations_by_section_cmd', { sectionId }) as any[];
  return results as DesignDocSectionRelation[];
}

/**
 * すべてのセクション関係を取得
 */
export async function getAllSectionRelations(): Promise<DesignDocSectionRelation[]> {
  const results = await callTauriCommand('get_all_design_doc_section_relations_cmd', {}) as any[];
  return results as DesignDocSectionRelation[];
}

/**
 * セクション関係を削除
 */
export async function deleteSectionRelation(id: string): Promise<void> {
  await callTauriCommand('delete_design_doc_section_relation_cmd', { id });
}

/**
 * 関係タイプの定義
 */
export const RELATION_TYPES = [
  { value: 'references', label: '参照 (references)' },
  { value: 'depends_on', label: '依存 (depends_on)' },
  { value: 'implements', label: '実装 (implements)' },
  { value: 'related_to', label: '関連 (related_to)' },
  { value: 'extends', label: '拡張 (extends)' },
  { value: 'uses', label: '使用 (uses)' },
] as const;
