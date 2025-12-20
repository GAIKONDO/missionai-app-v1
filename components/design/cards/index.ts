/**
 * カードコンポーネントのエクスポート
 * 新しいカードを追加する場合は、ここにエクスポートを追加してください
 */

import React from 'react';

// カードコンポーネントをインポート
// import { ExampleCard } from './ExampleCard';
import { AppArchitectureCard } from './AppArchitectureCard';
import { DatabaseOverviewCard } from './DatabaseOverviewCard';
import { SQLiteSchemaCard } from './SQLiteSchemaCard';
import { ChromaDBSchemaCard } from './ChromaDBSchemaCard';
import { DataFlowCard } from './DataFlowCard';
import { PageStructureCard } from './PageStructureCard';

// カードコンポーネントの型定義
export interface CardComponent {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
}

// カードコンポーネントのリスト
// 新しいカードを追加する場合は、この配列に追加してください
export const cardComponents: CardComponent[] = [
  { 
    id: 'app-architecture', 
    title: 'アプリ全体構成', 
    description: '使用ライブラリとアーキテクチャ', 
    component: AppArchitectureCard 
  },
  { 
    id: 'database-overview', 
    title: 'データベース構成', 
    description: 'SQLiteとChromaDBの全体構成', 
    component: DatabaseOverviewCard 
  },
  { 
    id: 'sqlite-schema', 
    title: 'SQLiteスキーマ', 
    description: 'SQLiteに保存されるデータ構造とテーブル関係', 
    component: SQLiteSchemaCard 
  },
  { 
    id: 'chromadb-schema', 
    title: 'ChromaDBスキーマ', 
    description: 'ChromaDBに保存されるベクトルデータ', 
    component: ChromaDBSchemaCard 
  },
  { 
    id: 'data-flow', 
    title: 'データフロー', 
    description: 'データの保存・取得の流れ', 
    component: DataFlowCard 
  },
  { 
    id: 'page-structure', 
    title: 'ページ構造', 
    description: 'ページ間のリンク関係とID管理', 
    component: PageStructureCard 
  },
];
