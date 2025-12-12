/**
 * システム設計ドキュメントセクション管理
 * SQLiteに保存されたセクションを管理
 */

import { callTauriCommand } from './localFirebase';

export interface DesignDocSection {
  id: string;
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  order: number;
  pageUrl: string;
  hierarchy?: string[];
  relatedSections?: string[];
  semanticCategory?: string;
  keywords?: string[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * セクションを作成
 */
export async function createSection(
  title: string,
  description: string | undefined,
  content: string,
  tags?: string[],
  order?: number,
  pageUrl?: string,
  hierarchy?: string[],
  relatedSections?: string[],
  semanticCategory?: string,
  keywords?: string[],
  summary?: string,
): Promise<DesignDocSection> {
  const result = await callTauriCommand('create_design_doc_section_cmd', {
    title,
    description: description || null,
    content,
    tags: tags || null,
    order: order || null,
    pageUrl: pageUrl || null,
    hierarchy: hierarchy || null,
    relatedSections: relatedSections || null,
    semanticCategory: semanticCategory || null,
    keywords: keywords || null,
    summary: summary || null,
  });

  // JSON文字列を配列に変換
  if (result.tags && typeof result.tags === 'string') {
    try {
      result.tags = JSON.parse(result.tags);
    } catch {
      result.tags = [];
    }
  }
  if (result.hierarchy && typeof result.hierarchy === 'string') {
    try {
      result.hierarchy = JSON.parse(result.hierarchy);
    } catch {
      result.hierarchy = [];
    }
  }
  if (result.relatedSections && typeof result.relatedSections === 'string') {
    try {
      result.relatedSections = JSON.parse(result.relatedSections);
    } catch {
      result.relatedSections = [];
    }
  }
  if (result.keywords && typeof result.keywords === 'string') {
    try {
      result.keywords = JSON.parse(result.keywords);
    } catch {
      result.keywords = [];
    }
  }

  return result as DesignDocSection;
}

/**
 * セクションを更新
 */
export async function updateSection(
  id: string,
  title?: string,
  description?: string,
  content?: string,
  tags?: string[],
  order?: number,
  pageUrl?: string,
  hierarchy?: string[],
  relatedSections?: string[],
  semanticCategory?: string,
  keywords?: string[],
  summary?: string,
): Promise<DesignDocSection> {
  const result = await callTauriCommand('update_design_doc_section_cmd', {
    id,
    title: title || null,
    description: description !== undefined ? description : null,
    content: content || null,
    tags: tags || null,
    order: order !== undefined ? order : null,
    pageUrl: pageUrl || null,
    hierarchy: hierarchy || null,
    relatedSections: relatedSections || null,
    semanticCategory: semanticCategory || null,
    keywords: keywords || null,
    summary: summary !== undefined ? summary : null,
  });

  // JSON文字列を配列に変換
  if (result.tags && typeof result.tags === 'string') {
    try {
      result.tags = JSON.parse(result.tags);
    } catch {
      result.tags = [];
    }
  }
  if (result.hierarchy && typeof result.hierarchy === 'string') {
    try {
      result.hierarchy = JSON.parse(result.hierarchy);
    } catch {
      result.hierarchy = [];
    }
  }
  if (result.relatedSections && typeof result.relatedSections === 'string') {
    try {
      result.relatedSections = JSON.parse(result.relatedSections);
    } catch {
      result.relatedSections = [];
    }
  }
  if (result.keywords && typeof result.keywords === 'string') {
    try {
      result.keywords = JSON.parse(result.keywords);
    } catch {
      result.keywords = [];
    }
  }

  return result as DesignDocSection;
}

/**
 * IDでセクションを取得
 */
export async function getSection(id: string): Promise<DesignDocSection> {
  const result = await callTauriCommand('get_design_doc_section_cmd', { id });

  // JSON文字列を配列に変換
  if (result.tags && typeof result.tags === 'string') {
    try {
      result.tags = JSON.parse(result.tags);
    } catch {
      result.tags = [];
    }
  }
  if (result.hierarchy && typeof result.hierarchy === 'string') {
    try {
      result.hierarchy = JSON.parse(result.hierarchy);
    } catch {
      result.hierarchy = [];
    }
  }
  if (result.relatedSections && typeof result.relatedSections === 'string') {
    try {
      result.relatedSections = JSON.parse(result.relatedSections);
    } catch {
      result.relatedSections = [];
    }
  }
  if (result.keywords && typeof result.keywords === 'string') {
    try {
      result.keywords = JSON.parse(result.keywords);
    } catch {
      result.keywords = [];
    }
  }

  return result as DesignDocSection;
}

/**
 * すべてのセクションを取得
 */
export async function getAllSections(): Promise<DesignDocSection[]> {
  const results = await callTauriCommand('get_all_design_doc_sections_cmd', {}) as any[];

  return results.map(result => {
    // JSON文字列を配列に変換
    if (result.tags && typeof result.tags === 'string') {
      try {
        result.tags = JSON.parse(result.tags);
      } catch {
        result.tags = [];
      }
    }
    if (result.hierarchy && typeof result.hierarchy === 'string') {
      try {
        result.hierarchy = JSON.parse(result.hierarchy);
      } catch {
        result.hierarchy = [];
      }
    }
    if (result.relatedSections && typeof result.relatedSections === 'string') {
      try {
        result.relatedSections = JSON.parse(result.relatedSections);
      } catch {
        result.relatedSections = [];
      }
    }
    if (result.keywords && typeof result.keywords === 'string') {
      try {
        result.keywords = JSON.parse(result.keywords);
      } catch {
        result.keywords = [];
      }
    }
    return result as DesignDocSection;
  });
}

/**
 * すべてのセクションを取得（contentを除外した軽量版）
 * 一覧表示用に最適化されており、contentフィールドは空文字列になります
 */
export async function getAllSectionsLightweight(): Promise<DesignDocSection[]> {
  const results = await callTauriCommand('get_all_design_doc_sections_lightweight_cmd', {}) as any[];

  return results.map(result => {
    // JSON文字列を配列に変換
    if (result.tags && typeof result.tags === 'string') {
      try {
        result.tags = JSON.parse(result.tags);
      } catch {
        result.tags = [];
      }
    }
    if (result.hierarchy && typeof result.hierarchy === 'string') {
      try {
        result.hierarchy = JSON.parse(result.hierarchy);
      } catch {
        result.hierarchy = [];
      }
    }
    if (result.relatedSections && typeof result.relatedSections === 'string') {
      try {
        result.relatedSections = JSON.parse(result.relatedSections);
      } catch {
        result.relatedSections = [];
      }
    }
    if (result.keywords && typeof result.keywords === 'string') {
      try {
        result.keywords = JSON.parse(result.keywords);
      } catch {
        result.keywords = [];
      }
    }
    return result as DesignDocSection;
  });
}

/**
 * セクションを削除
 */
export async function deleteSection(id: string): Promise<void> {
  await callTauriCommand('delete_design_doc_section_cmd', { id });
}
