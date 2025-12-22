// デザインシステム
export const DESIGN = {
  colors: {
    theme: {
      fill: '#1A1A1A',
      stroke: '#000000',
      text: '#FFFFFF',
      hover: '#2D2D2D',
    },
    organization: {
      fill: '#10B981',
      stroke: '#059669',
      text: '#FFFFFF',
      hover: '#34D399',
    },
    initiative: {
      fill: '#4262FF',
      stroke: '#2E4ED8',
      text: '#FFFFFF',
      hover: '#5C7AFF',
    },
    topic: {
      fill: '#F59E0B',
      stroke: '#D97706',
      text: '#FFFFFF',
      hover: '#FBBF24',
    },
    connection: {
      main: '#666666',      // より濃いグレー（#C4C4C4 → #666666）
      branch: '#888888',    // より濃いグレー（#E0E0E0 → #888888）
      hover: '#333333',     // ホバー時はさらに濃く（#808080 → #333333）
    },
    background: {
      base: '#FFFFFF',
    },
  },
  typography: {
    theme: {
      fontSize: '16px',
      fontWeight: '600',
    },
    organization: {
      fontSize: '14px',
      fontWeight: '600',
    },
    initiative: {
      fontSize: '14px',
      fontWeight: '500',
    },
    topic: {
      fontSize: '12px',
      fontWeight: '500',
    },
  },
  spacing: {
    nodePadding: {
      theme: { x: 20, y: 10 },
      organization: { x: 16, y: 8 },
      initiative: { x: 16, y: 8 },
      topic: { x: 12, y: 6 },
    },
    radius: {
      theme: 6,
      organization: 6,
      initiative: 6,
      topic: 4,
    },
  },
  stroke: {
    main: 2,
    branch: 1.5,
    node: 1.5,
  },
  animation: {
    duration: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// GPTモデルリスト
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
] as const;

// エンティティタイプラベル
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

// リレーションタイプラベル
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

// 重要度の色設定
export const IMPORTANCE_COLORS = {
  high: {
    background: '#FEE2E2',
    border: '#EF4444',
    text: '#991B1B',
  },
  medium: {
    background: '#FEF3C7',
    border: '#F59E0B',
    text: '#92400E',
  },
  low: {
    background: '#DBEAFE',
    border: '#3B82F6',
    text: '#1E40AF',
  },
} as const;

