import React from 'react';
import { DesignCard, DesignCardProps } from './DesignCard';

/**
 * SQLiteスキーマのカードコンポーネント
 */
export function SQLiteSchemaCard(props: DesignCardProps) {
  return (
    <DesignCard {...props} />
  );
}
