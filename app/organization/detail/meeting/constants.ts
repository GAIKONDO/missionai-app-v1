import type { MonthTab, SummaryTab } from './types';

export const MONTHS: Array<{ id: MonthTab; label: string }> = [
  { id: 'april', label: '4月' },
  { id: 'may', label: '5月' },
  { id: 'june', label: '6月' },
  { id: 'july', label: '7月' },
  { id: 'august', label: '8月' },
  { id: 'september', label: '9月' },
  { id: 'october', label: '10月' },
  { id: 'november', label: '11月' },
  { id: 'december', label: '12月' },
  { id: 'january', label: '1月' },
  { id: 'february', label: '2月' },
  { id: 'march', label: '3月' },
];

export const SUMMARY_TABS: Array<{ id: SummaryTab; label: string }> = [
  { id: 'q1-summary', label: '1Q総括' },
  { id: 'q2-summary', label: '2Q総括' },
  { id: 'first-half-summary', label: '上期総括' },
  { id: 'q3-summary', label: '3Q総括' },
  { id: 'q1-q3-summary', label: '1-3Q総括' },
  { id: 'q4-summary', label: '4Q総括' },
  { id: 'annual-summary', label: '年間総括' },
];

export const GPT_MODELS = [
  { value: 'gpt-5.1', label: 'gpt-5.1' },
  { value: 'gpt-5', label: 'gpt-5' },
  { value: 'gpt-5-mini', label: 'gpt-5-mini' },
  { value: 'gpt-5-nano', label: 'gpt-5-nano' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
];

export const RELATION_TYPE_LABELS: Record<string, string> = {
  'subsidiary': '子会社',
  'uses': '使用',
  'invests': '出資',
  'employs': '雇用',
  'partners': '提携',
  'competes': '競合',
  'supplies': '供給',
  'owns': '所有',
  'located-in': '所在',
  'works-for': '勤務',
  'manages': '管理',
  'reports-to': '報告',
  'related-to': '関連',
  'other': 'その他',
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  'person': '👤 人',
  'company': '🏢 会社',
  'product': '📦 製品',
  'project': '📋 プロジェクト',
  'organization': '🏛️ 組織',
  'location': '📍 場所',
  'technology': '💻 技術',
  'other': '📌 その他',
};

