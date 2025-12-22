export type MonthTab = 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'january' | 'february' | 'march';
export type SummaryTab = 'q1-summary' | 'q2-summary' | 'first-half-summary' | 'q3-summary' | 'q1-q3-summary' | 'q4-summary' | 'annual-summary';
export type TabType = MonthTab | SummaryTab;

import type { Topic } from '@/types/topicMetadata';

export interface MonthContent {
  summary: string; // 月サマリのMDコンテンツ
  summaryId?: string; // サマリのユニークID
  items: Array<{
    id: string;
    title: string;
    content: string; // MDコンテンツ
    location?: string;
    date?: string;
    author?: string;
    topics?: Array<Topic>; // Topic型に拡張（メタデータを含む）
  }>;
}

export interface MeetingNoteData {
  [key: string]: MonthContent; // 月も総括タブもMonthContent型
}

