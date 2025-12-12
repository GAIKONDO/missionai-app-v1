import { ComponentType } from 'react';
import dynamic from 'next/dynamic';

// ページコンポーネントの型定義
export interface PageConfig {
  id: string;
  pageNumber: number;
  component: ComponentType<any>;
  title?: string; // 動的ページのタイトル（オプショナル）
}

// 動的インポートでページコンポーネントを読み込む
const Page0 = dynamic(() => import('./Page0'), { ssr: false });

// ページ設定配列（順序が重要）
export const pageConfigs: PageConfig[] = [
  {
    id: 'page-0',
    pageNumber: 0,
    component: Page0,
  },
];

// ページIDからコンポーネントを取得するヘルパー関数
export const getPageComponent = (pageId: string): ComponentType<any> | undefined => {
  const config = pageConfigs.find(p => p.id === pageId);
  return config?.component;
};

// ページ番号からコンポーネントを取得するヘルパー関数
export const getPageComponentByNumber = (pageNumber: number): ComponentType<any> | undefined => {
  const config = pageConfigs.find(p => p.pageNumber === pageNumber);
  return config?.component;
};

