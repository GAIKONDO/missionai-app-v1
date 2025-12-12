/**
 * ページメタデータの型定義
 */

export type ContentType = 
  | 'diagram' 
  | 'table' 
  | 'list' 
  | 'comparison' 
  | 'process-flow' 
  | 'key-visual' 
  | 'mixed' 
  | 'text';

export type SectionType = 
  | 'introduction' 
  | 'main' 
  | 'main-content'
  | 'conclusion' 
  | 'appendix'
  | 'summary';

export type Importance = 
  | 'high' 
  | 'medium' 
  | 'low';

export interface ContentStructure {
  pageId: string;
  headings?: Array<{
    level: number;
    text: string;
    position: number;
  }>;
  sections?: Array<{
    title: string;
    startPosition: number;
    endPosition: number;
    type: 'paragraph' | 'list' | 'table' | 'diagram' | 'code' | 'image';
  }>;
  hasImages?: boolean;
  hasDiagrams?: boolean;
  hasTables?: boolean;
  hasLists?: boolean;
  wordCount?: number;
  readingTime?: number;
}

export interface PageRelations {
  pageId?: string;
  previousPageId?: string;
  nextPageId?: string;
  references?: string[];
  similarPages?: Array<{
    pageId: string;
    similarity: number;
  }>;
  topics?: string[];
  topicHierarchy?: Array<{
    level: number;
    topic: string;
  }>;
}

export interface FormatPattern {
  layoutType?: 'single-column' | 'two-column' | 'grid' | 'mixed';
  stylePattern?: {
    hasKeyMessage?: boolean;
    hasCards?: boolean;
    colorScheme?: string;
    visualElements?: string[];
  };
  contentPattern?: {
    structure?: string;
    hasIntroduction?: boolean;
    hasConclusion?: boolean;
    hasCallToAction?: boolean;
  };
}

export interface PageMetadata {
  id: string;
  pageNumber: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  contentType?: ContentType;
  keywords?: string[];
  semanticCategory?: string;
  tags?: string[];
  sectionType?: SectionType;
  importance?: Importance;
  summary?: string;
  contentStructure?: ContentStructure;
  pageRelations?: PageRelations;
  formatPattern?: FormatPattern;
  subMenuId?: string;
  relatedPageIds?: string[]; // 後方互換性のため
  planId?: string;
  conceptId?: string;
}

export interface PageEmbedding {
  pageId: string;
  combinedEmbedding?: number[];
  titleEmbedding?: number[];
  contentEmbedding?: number[];
  metadataEmbedding?: number[];
  embeddingModel: string;
  embeddingVersion: string;
  semanticCategory?: string;
  keywords?: string[];
  tags?: string[];
  planId?: string;
  conceptId?: string;
  createdAt: string;
  updatedAt?: string;
}

