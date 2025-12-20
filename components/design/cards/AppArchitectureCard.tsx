import React from 'react';
import { DesignCard, DesignCardProps } from './DesignCard';

/**
 * アプリ全体構成のカードコンポーネント
 */
export function AppArchitectureCard(props: DesignCardProps) {
  return (
    <DesignCard {...props} />
  );
}
