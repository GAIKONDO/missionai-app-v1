import React from 'react';
import { DesignCard, DesignCardProps } from './DesignCard';

/**
 * データフローのカードコンポーネント
 */
export function DataFlowCard(props: DesignCardProps) {
  return (
    <DesignCard {...props} />
  );
}
