// ノードタイプごとの色設定
export const NODE_COLORS = {
  theme: '#1A1A1A',
  organization: '#10B981',
  company: '#10B981', // 事業会社は組織と同じ色を使用
  initiative: '#4262FF',
  topic: '#F59E0B',
};

// 深さに応じた色を取得
export const getColorByDepth = (depth: number, nodeType: string): string => {
  if (nodeType === 'theme') {
    return NODE_COLORS.theme;
  } else if (nodeType === 'organization' || nodeType === 'company') {
    return NODE_COLORS.organization;
  } else if (nodeType === 'initiative') {
    return NODE_COLORS.initiative;
  } else if (nodeType === 'topic') {
    return NODE_COLORS.topic;
  }
  return '#808080';
};

