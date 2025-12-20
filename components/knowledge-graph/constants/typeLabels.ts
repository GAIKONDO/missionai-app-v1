// エンティティタイプとリレーションタイプのラベル定義

export const entityTypeLabels: Record<string, string> = {
  'person': '👤 人',
  'company': '🏢 会社',
  'product': '📦 製品',
  'project': '📋 プロジェクト',
  'organization': '🏛️ 組織',
  'location': '📍 場所',
  'technology': '💻 技術',
  'other': '📌 その他',
};

export const relationTypeLabels: Record<string, string> = {
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
