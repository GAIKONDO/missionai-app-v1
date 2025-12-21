import React from 'react';
import { DesignCard, DesignCardProps } from './DesignCard';

/**
 * オーケストレーションレイヤー、MCPサーバー、LLMの連携のカードコンポーネント
 */
export function OrchestrationMCPLLMCard(props: DesignCardProps) {
  return (
    <DesignCard {...props} />
  );
}

